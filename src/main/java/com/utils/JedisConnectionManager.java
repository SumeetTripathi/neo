package com.utils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.clients.jedis.Protocol;

/**
 * @author Sumeet.Tripathi
 *
 */
public class JedisConnectionManager {

	private static JedisPool jedisPool;
	private static Properties config;

	static {
		InputStream is = Thread.currentThread().getContextClassLoader()
				.getResourceAsStream("redis.properties");
		config = new Properties();
		try {
			config.load(is);
			jedisPool();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static String getServerName() {
		return config.getProperty("app.server.name");
	}

	public static void jedisPool() {
		try {

			JedisPoolConfig c = getPoolConfig();
			String password = null;

			int db_name = (config.getProperty("redis.db") != null) ? Integer
					.parseInt(config.getProperty("redis.db")) : 2;
			jedisPool = new JedisPool(c, config.getProperty("redis.host"),
					Integer.parseInt(config.getProperty("redis.port")),
					Protocol.DEFAULT_TIMEOUT, password, db_name);

			// setup JVM shutdown hook
			Runtime.getRuntime().addShutdownHook(new Thread() {
				@Override
				public void run() {
					System.out.println("Running shutdown hook");
					jedisPool.destroy();
				}
			});
		} catch (Exception e) {
			System.out.println("Redis Initilization Failed: " + e);
		}

	}

	public static Jedis getConnection() {

		Jedis conn = jedisPool.getResource();
		return conn;
	}

	public static void release(Jedis conn) {
		jedisPool.returnResource(conn);
	}

	private static JedisPoolConfig getPoolConfig() {
		final JedisPoolConfig poolConfig = new JedisPoolConfig();
		poolConfig.setMaxTotal(Integer.parseInt(config
				.getProperty("redis.max.connections")));
		poolConfig.setMaxIdle(Integer.parseInt(config
				.getProperty("redis.max.idle")));
		poolConfig.setMinIdle(Integer.parseInt(config
				.getProperty("redis.min.idle")));
		poolConfig.setTestOnBorrow(Boolean.parseBoolean(config
				.getProperty("redis.test.borrow")));
		poolConfig.setTestOnReturn(Boolean.parseBoolean(config
				.getProperty("redis.test.return")));
		poolConfig.setTestWhileIdle(Boolean.parseBoolean(config
				.getProperty("redis.test.idle")));
		poolConfig.setBlockWhenExhausted(Boolean.parseBoolean(config
				.getProperty("redis.block.whenExhausted")));
		return poolConfig;
	}
}
