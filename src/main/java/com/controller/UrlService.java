package com.controller;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Properties;

import javax.annotation.PostConstruct;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.cache.RedisCache;
import com.cache.impl.EHCacheImpl;
import com.cache.impl.InMemoryCacheImpl;
import com.cache.impl.RedisCacheImpl;
import com.utils.JedisConnectionManager;

@Controller
public class UrlService {

	private static Properties config;

	private RedisCache redisCache;
	static {
		InputStream is = Thread.currentThread().getContextClassLoader()
				.getResourceAsStream("redis.properties");
		config = new Properties();
		try {
			config.load(is);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	@PostConstruct
	public void loadCache() {
		try {

			if (config.getProperty("app.cache.manager").equalsIgnoreCase(
					"EHCACHE")) {
				redisCache = new EHCacheImpl();
			} else if(config.getProperty("app.cache.manager").equalsIgnoreCase(
					"REDIS")){
				redisCache = new RedisCacheImpl();
			}else{
				redisCache = new InMemoryCacheImpl();
			}
		} catch (Throwable e) {
			//do-nothing
		}
	}

	@RequestMapping(value = "/", method = RequestMethod.GET)
	public String home(Locale locale, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		return "home";
	}
	
	@RequestMapping(value = "/runit", method = RequestMethod.GET)
	public String runit(Locale locale, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName()+"runit");
		return "runit";
	}

	@RequestMapping(value = "/shrinkurl", method = RequestMethod.POST)
	public String shrinkUrl(String url, String customUrl, Integer expiry,
			String password, Model model) {

		String key;
		model.addAttribute("serverName", JedisConnectionManager.getServerName());

		if (customUrl != null && customUrl.trim().length() > 0) {
			if (redisCache.validateUrl(customUrl)) {
				key = redisCache.addUrl(customUrl, url, expiry);

			} else {
				key = redisCache.addUrl(null, url, expiry);
				model.addAttribute("message",
						"Custom alias already in use, a new key is generated");
			}
		} else {
			key = redisCache.addUrl(customUrl, url, expiry);
		}
		model.addAttribute("shrinkurl", key);
		if (password != null && password.trim().length() > 0) {
			redisCache.passwordProtected(key, password, expiry);
		}
		return "shrinkurl";
	}

	@RequestMapping(value = "/trackusage", method = RequestMethod.POST)
	public String trackUsage(String shrinkurl, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		try {
			model.addAttribute("hits", redisCache.getHits(shrinkurl));
		} catch (Throwable e) {
			// do-nothing url read never occurred
		}
		model.addAttribute("shrinkurl", shrinkurl);

		return "trackusage";
	}

	@RequestMapping(value = "/{url}", method = RequestMethod.GET)
	public String getUrl(@PathVariable("url") String url, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		try {
			if (redisCache.isPasswordProtected(url)) {
				model.addAttribute("serverName",
						JedisConnectionManager.getServerName());
				model.addAttribute("shrinkurl", url);
				return "pwdprotected";
			} else {
				String redirectUrl=redisCache.getUrl(url);
				if(redirectUrl!=null && redirectUrl.length()>0){
					model.addAttribute("shrinkurl", redirectUrl);
					return "geturl";	
				}else{
					return "notfound";
				}
			}
		} catch (Exception e) {
			return "notfound";
		}
	}

	@RequestMapping(value = "/pwdprotected", method = RequestMethod.POST)
	public String getPwdProtectedUrl(String url, String pwd, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		try {
			if (redisCache.isPasswordCorrect(url, pwd)) {
				model.addAttribute("shrinkurl", redisCache.getUrl(url));
				return "geturl";
			} else {
				return "notfound";
			}
		} catch (Exception e) {
			return "notfound";
		}
	}

}
