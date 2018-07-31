package com.controller;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.cache.RedisCache;
import com.utils.JedisConnectionManager;

@Controller
public class UrlService {

	@Autowired
	private RedisCache redisCache;

	@RequestMapping(value = "/", method = RequestMethod.GET)
	public String home(Locale locale, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		return "home";
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
		if(password!=null && password.trim().length()>0){
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
			if(redisCache.isPasswordProtected(url)){
				model.addAttribute("serverName", JedisConnectionManager.getServerName());
				model.addAttribute("shrinkurl", url);
				return "pwdprotected";
			}else{
				model.addAttribute("shrinkurl", redisCache.getUrl(url));
				return "geturl";
			}
		} catch (Exception e) {
			return "notfound";
		}
	}
	
	@RequestMapping(value = "/pwdprotected", method = RequestMethod.POST)
	public String getPwdProtectedUrl(String url,String pwd, Model model) {
		model.addAttribute("serverName", JedisConnectionManager.getServerName());
		try {
			if(redisCache.isPasswordCorrect(url, pwd)){
				model.addAttribute("shrinkurl", redisCache.getUrl(url));
				return "geturl";
			}else{
				return "notfound";
			}
		} catch (Exception e) {
			return "notfound";
		}
	}

}
