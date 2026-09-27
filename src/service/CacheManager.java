package service;

import model.RoutingMetrics;

import java.util.HashMap;
import java.util.Map;

public class CacheManager {

    private Map<String, RoutingMetrics> cache = new HashMap<>();

    public void addRoute(String key, RoutingMetrics route){

        cache.put(key,route);

    }

    public RoutingMetrics getRoute(String key){

        return cache.get(key);

    }

    public boolean contains(String key){

        return cache.containsKey(key);

    }

}