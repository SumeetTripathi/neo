/**
 * 
 */
package com.cache.impl;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import com.cache.RedisCache;

/**
 * @author Sumeet.Tripathi
 *
 */
public class InMemoryCacheImpl implements RedisCache {

	private static Properties config;

	Map<String, Map<String, Object>> urlBucket = new ConcurrentHashMap<String, Map<String, Object>>();
	Map<String, AtomicLong> hitBucket = new ConcurrentHashMap<String, AtomicLong>();

	static {
		System.out.println("configuring!!!");
		InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("redis.properties");
		config = new Properties();
		try {
			config.load(is);
		} catch (IOException e) {
			e.printStackTrace();
		}

		System.out.println("configuration done!!!");
	}

	public static String getServerName() {
		return config.getProperty("app.server.name");
	}

	public String addUrl(String key, String value, Integer minutes) {
		if (key != null && key.trim().length() > 0) {
			// do-nothing
		} else {
			key = UUID.randomUUID().toString().split("-")[0];
			while (!validateUrl(key)) {
				key = UUID.randomUUID().toString().split("-")[0];
			}
		}
		Long expiry = null;

		if (minutes != null && minutes > 0) {
			expiry = System.currentTimeMillis() + (minutes * 60 * 1000);
		}

		Map<String, Object> urlEntry = new ConcurrentHashMap<String, Object>();
		urlEntry.put("url", value);
		urlEntry.put("expiry", expiry);

		urlBucket.put(key, urlEntry);
		hitBucket.put(key, new AtomicLong(0l));

		return key;

	}

	public String getUrl(String key) {
		Map<String, Object> urlEntry = urlBucket.get(key);
		if (urlEntry == null) {
			return null;
		} else {
			if ((Long) urlEntry.get("expiry") != null) {
				if (((Long) urlEntry.get("expiry")).longValue() < System.currentTimeMillis()) {
					hitBucket.get(key).incrementAndGet();
					return (String) urlEntry.get("url");
				} else {
					hitBucket.remove(key);
					urlBucket.remove(key);
					return null;
				}
			} else {
				hitBucket.get(key).incrementAndGet();
				return (String) urlEntry.get("url");
			}

		}
	}

	public Boolean validateUrl(String key) {
		Map<String, Object> ele = urlBucket.get(key);
		if (ele == null) {
			return Boolean.TRUE;
		} else {
			return Boolean.FALSE;
		}

	}

	public String getHits(String hash) throws Throwable {
		AtomicLong hits = hitBucket.get(hash);
		return hits == null ? "0" : hits.toString();
	}

	public void passwordProtected(String key, String password, Integer minutes) {
		urlBucket.get(key).put("pwd", password);
	}

	public Boolean isPasswordProtected(String key) {
		Object ele = urlBucket.get(key).get("pwd");
		return ele == null ? Boolean.FALSE : Boolean.TRUE;
	}

	public Boolean isPasswordCorrect(String key, String pwd) {
		Object ele = urlBucket.get(key).get("pwd");
		String savedPwd = ele == null ? "" : (String) ele;
		if (savedPwd.equals(pwd.trim())) {
			return Boolean.TRUE;
		} else {
			return Boolean.FALSE;
		}
	}
}
