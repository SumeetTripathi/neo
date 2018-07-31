package com.cache;

/**
 * @author Sumeet.Tripathi
 *
 */
public interface RedisCache {

	public String addUrl(String key, String value, Integer minutes);

	public String getUrl(String key);

	public Boolean validateUrl(String key);

	public String getHits(String hash) throws Throwable;

	public void passwordProtected(String key, String password, Integer minutes);

	public Boolean isPasswordProtected(String key);

	public Boolean isPasswordCorrect(String key, String pwd);

}
