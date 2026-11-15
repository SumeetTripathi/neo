package com.marrowborn.server;

import com.marrowborn.net.JoinCode;
import com.marrowborn.net.Relay;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Desktop;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.net.URI;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.Timer;

/** A small window for people who start the server by double-click: where to connect, who is connected, and Quit. */
final class StatusWindow {
    private StatusWindow() { }

    static void show(final Relay relay, final String local, final List<String> ips) {
        SwingUtilities.invokeLater(new Runnable() { public void run() {
            final JFrame f = new JFrame("Ashes to Apex server");
            f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            final JTextArea t = new JTextArea(14, 52);
            t.setEditable(false);
            t.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 14));
            t.setBackground(new Color(0x10142a)); t.setForeground(new Color(0xeeecfb));
            t.setBorder(BorderFactory.createEmptyBorder(12, 14, 12, 14));
            JButton open = new JButton("Open the game"), quit = new JButton("Quit");
            open.addActionListener(new ActionListener() { public void actionPerformed(ActionEvent e) {
                try { Desktop.getDesktop().browse(new URI(local)); } catch (Throwable ignored) { }
            } });
            quit.addActionListener(new ActionListener() { public void actionPerformed(ActionEvent e) { relay.stop(); System.exit(0); } });
            JPanel b = new JPanel(); b.add(open); b.add(quit);
            f.getContentPane().add(t, BorderLayout.CENTER);
            f.getContentPane().add(b, BorderLayout.SOUTH);
            final Runnable fill = new Runnable() { public void run() {
                StringBuilder s = new StringBuilder("Ashes to Apex server " + Main.VERSION + "\n\nOn this computer:   " + local + "\n");
                if (ips.isEmpty()) s.append("No local network address found.\n");
                for (String ip : ips) s.append("On other devices:   http://").append(ip).append(':').append(relay.port()).append("/\n")
                    .append("Join code:          ").append(JoinCode.pretty(JoinCode.encode(ip, relay.port()))).append('\n');
                List<String> rooms = relay.describe();
                s.append("\nPlayers connected: ").append(relay.memberCount()).append('\n');
                for (String r : rooms) s.append("  ").append(r).append('\n');
                s.append("\nFor a trusted local network only. Closing this window stops the server.");
                if (!s.toString().equals(t.getText())) t.setText(s.toString());
            } };
            fill.run();
            new Timer(1000, new ActionListener() { public void actionPerformed(ActionEvent e) { fill.run(); } }).start();
            f.pack(); f.setLocationByPlatform(true); f.setVisible(true);
        } });
    }
}
