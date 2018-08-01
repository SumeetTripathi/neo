/**
 * 
 */
package com.cache.impl;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Element;
import net.sf.ehcache.config.CacheConfiguration;

import com.cache.RedisCache;

/**
 * @author Sumeet.Tripathi
 *
 */
public class EHCacheImpl implements RedisCache {

	private static Properties config;
	private static CacheManager cm;
	private static final String PWD_PROTECTED = "PWD_PROTECTED";
	private static final String HITS = "HITS";

	static {
		System.out.println("configuring!!!");
		InputStream is = Thread.currentThread().getContextClassLoader()
				.getResourceAsStream("redis.properties");
		config = new Properties();
		try {
			config.load(is);
		} catch (IOException e) {
			e.printStackTrace();
		}

		try {
			cm = CacheManager.getInstance();
			cm.addCache(PWD_PROTECTED);
			cm.addCache(HITS);

		} catch (Exception e) {
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

		if (minutes != null && minutes > 0) {
			CacheConfiguration cacheConfiguration = new CacheConfiguration()
					.name(key).maxEntriesLocalHeap(100)
					.timeToLiveSeconds(60 * minutes);
			cm.addCache(new Cache(cacheConfiguration));
		} else {
			cm.addCache(key);
		}

		Cache cache = cm.getCache(key);
		cache.put(new Element("url", value));

		Cache hits = cm.getCache(HITS);
		hits.put(new Element(key, new AtomicLong(0l)));

		return key;

	}

	public String getUrl(String key) {
		Cache urlCache = cm.getCache(key);
		Element ele = urlCache.get("url");
		if (ele != null) {
			Cache hits = cm.getCache(HITS);
			Element hit = hits.get(key);
			hits.put(new Element(key, new AtomicLong(((AtomicLong) hit
					.getObjectValue()).incrementAndGet())));
		}
		return ele == null ? null : ele.getObjectValue().toString();
	}

	public Boolean validateUrl(String key) {
		Cache urlCache = cm.getCache(HITS);
		Element ele = urlCache.get(key);
		if (ele == null) {
			return Boolean.TRUE;
		} else {
			return Boolean.FALSE;
		}

	}

	public String getHits(String hash) throws Throwable {
		Cache hits = cm.getCache(HITS);
		Element ele = hits.get(hash);
		return ele == null ? "0" : ele.getObjectValue().toString();
	}

	public void passwordProtected(String key, String password, Integer minutes) {
		Cache cache = cm.getCache(key);
		cache.put(new Element("pwd", password));
	}

	public Boolean isPasswordProtected(String key) {
		Cache cache = cm.getCache(key);
		Element ele = cache.get("pwd");
		return ele == null ? Boolean.FALSE : Boolean.TRUE;
	}

	public Boolean isPasswordCorrect(String key, String pwd) {
		Cache cache = cm.getCache(key);
		Element ele = cache.get("pwd");
		String savedPwd = ele == null ? "" : ele.getObjectValue().toString();
		if (savedPwd.equals(pwd.trim())) {
			return Boolean.TRUE;
		} else {
			return Boolean.FALSE;
		}
	}
}
