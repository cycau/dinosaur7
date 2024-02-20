package com.cycau.d7server.controller;

import java.util.Map;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.List;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.yaml.snakeyaml.Yaml;

import javax.annotation.PostConstruct;

@Component
public class MockData {
    @Value("${d7server.devmode}")
    private boolean devmode;
    @Value("${d7server.resource.root}")
    private String resourceRoot;

    private ClassLoader exClassLoader;
    @PostConstruct
    private void init() throws MalformedURLException {
    	if (!resourceRoot.isBlank())
    	exClassLoader = new URLClassLoader(new URL[]{new File(resourceRoot).toURI().toURL()});
    }

    @SuppressWarnings("unchecked")
    public ResponseEntity<Object> getResponse(String method, String uri, Map<String, Object> httpRequest) throws IOException {
    	method = method.toUpperCase();
        uri = uri.endsWith("/")?uri.substring(0, uri.length()-1):uri;

        for (Map<String, Object> mock : collectMockData(method, uri)) {
            Map<String, Object> mcReq = (Map<String, Object>)mock.get("request");
            if (!equals(mcReq.get("uri"), uri)) {
            	System.out.println("[INFO] Not matched with Uri. " + mock.get("mock_name"));
            	continue;
            }
            if (!equals(mcReq.get("query"), httpRequest.get("query"))) {
            	System.out.println("[INFO] Not matched with Query. " + mock.get("mock_name"));
            	continue;
            }
            if (!equals(mcReq.get("headers"), httpRequest.get("headers"))) {
            	System.out.println("[INFO] Not matched with Headers. " + mock.get("mock_name"));
            	continue;
            }
            if (!equals(mcReq.get("data"), httpRequest.get("data"))) {
            	System.out.println("[INFO] Not matched with Data. " + mock.get("mock_name"));
            	continue;
            }
        	System.out.println("[INFO] Matched! with " + mock.get("mock_name"));

            HttpStatus status = HttpStatus.OK;
            Map<String, Object> mcResp = (Map<String, Object>)mock.get("response");
            if (mcResp.containsKey("status")) status = HttpStatus.valueOf((int)mcResp.get("status"));

            if (mcResp.containsKey("headers")) {
                MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
                Map<String, String> mcHeaders = (Map<String, String>)mcResp.get("headers");
                for(Map.Entry<String, String> keyVal : mcHeaders.entrySet()) {
                    headers.add(keyVal.getKey(), keyVal.getValue());
                }

                return new ResponseEntity<>(mcResp.get("body"), headers, status);
            }
            return new ResponseEntity<>(mcResp.get("body"), status);
        }

        return new ResponseEntity<>("Not found mock data.", HttpStatus.NOT_FOUND);
    }

    private List<Map<String, Object>> collectMockData(String method, String uri) throws IOException {
    	List<Map<String, Object>> mocks = new ArrayList<>();
        uri = uri.startsWith("/")?uri.substring(1):uri;
        
        InputStream is = null;
    	String resourcePath = null;
        ClassLoader classLoader = exClassLoader;
        if (classLoader != null) {
            resourcePath = uri;
        	is = classLoader.getResourceAsStream(resourcePath);
        }
        if (is == null) {
        	resourcePath = "public/" + uri;
            classLoader = Thread.currentThread().getContextClassLoader();
        	is = classLoader.getResourceAsStream(resourcePath);
        }
        if (is == null) {
        	resourcePath = uri;
            classLoader = ClassLoader.getSystemClassLoader();
        	is = classLoader.getResourceAsStream(resourcePath);
        }

        if (is == null) {
        	System.out.println("[ERROR] Not found mock path. /" + uri);
        	return mocks;
        }
        BufferedReader br = new BufferedReader(new InputStreamReader(is));

        String fileName;
        Yaml yaml = new Yaml();
        while ((fileName = br.readLine()) != null) {
            if (!fileName.startsWith(method)) continue;
            if (!fileName.endsWith(".yml")) continue;

            InputStream fileStream = classLoader.getResourceAsStream(resourcePath + "/" + fileName);
            InputStreamReader fileReader = new java.io.InputStreamReader(fileStream);
            try {
            	Map<String, Object> mockData = yaml.load(fileReader);
            	mockData.put("mock_name", resourcePath + "/" + fileName);
                mocks.add(mockData);
            } catch (Exception ex) {
                System.out.println("[ERROR] Wrong yaml format. " + resourcePath + "/" + fileName);
            }
            fileReader.close();
            fileStream.close();
        }
        is.close();
        br.close();

        if (mocks.size() < 1)
        System.out.println("[ERROR] Not found mock file. " + uri + "/" + method + "...yml");
    
        return mocks;
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
	private static boolean equals(Object mock, Object httpReq) {
        if (mock == null) return true;
        if (httpReq == null) return false;

        if (mock instanceof String) mock.equals(httpReq);
        if (mock instanceof Map) {
            if (!(httpReq instanceof Map)) return false;
            return compareMap((Map)mock, (Map)httpReq);
        }
        if (mock instanceof List) {
            if (!(httpReq instanceof List)) return false;
            return compareList((List)mock, (List)httpReq);
        }

        return mock.toString().equals(httpReq.toString());
    }
    private static boolean compareMap(Map<String, Object> mock, Map<String, Object> req) {
        if (mock.size() > req.size()) return false;
        for(String key : mock.keySet()) {
            if (!req.containsKey(key)) return false;
            if (!equals(mock.get(key), req.get(key))) return false;
        }
        return true;
    }
    private static boolean compareList(List<Object> mock, List<Object> req) {
        if (mock.size() > req.size()) return false;
        for(int idx=0; idx<mock.size(); idx++) {
            if (!equals(mock.get(idx), req.get(idx))) return false;
        }
        return true;
    }
}
