package com.cycau.d7server.controller;

import java.util.Map;
import java.io.IOException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.yaml.snakeyaml.Yaml;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;

public class MockData {
    private MockData() {}

    @SuppressWarnings("unchecked")
    public static ResponseEntity<Object> getResponse(HttpServletRequest req) {
        Map<String, Object> request = extractRequest(req);

        for (Map<String, Object> mock : getMocks(req.getMethod().toUpperCase(), req.getRequestURI())) {
            Map<String, Object> mcReq = (Map<String, Object>)mock.get("request");
            if (!equals(mcReq.get("uri"), request.get("uri"))) continue;
            if (!equals(mcReq.get("header"), request.get("header"))) continue;
            if (!equals(mcReq.get("query"), request.get("query"))) continue;
            if (!equals(mcReq.get("data"), request.get("data"))) continue;

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

    private static List<Map<String, Object>> getMocks(String method, String uri) {
        List<Map<String, Object>> mocks = new ArrayList<>();
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader();
        Yaml yaml = new Yaml();
        try {
            for (String mockName : getResourceFiles(method, uri)) {
                Resource resource = resourceLoader.getResource(mockName);
                java.io.InputStream is = resource.getInputStream();
                java.io.InputStreamReader reader = new java.io.InputStreamReader(is);
                mocks.add((Map<String, Object>) yaml.load(reader));
                reader.close();
                is.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return mocks;
    }

    private static List<String> getResourceFiles(String prefix, String uri) throws IOException {
        if (uri.endsWith("/")) uri = uri.substring(0, uri.length()-1);
        String resourcePath = "public" + uri + (uri.endsWith("/")?"":"/");
        List<String> filenames = new ArrayList<>();
        java.io.InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream(resourcePath);
        if (is == null) is = ClassLoader.getSystemClassLoader().getResourceAsStream(resourcePath);
        
        java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is));

        String fileName;
        while ((fileName = br.readLine()) != null) {
            if (!fileName.startsWith(prefix)) continue;
            if (!fileName.endsWith(".yml")) continue;
            filenames.add(resourcePath + fileName);
        }
    
        return filenames;
    }

    private static Map<String, Object> extractRequest(HttpServletRequest req) {
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> header = new HashMap<>();
        Map<String, Object> parameter = new HashMap<>();

        Enumeration<String> headerNames = req.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            header.put(name, req.getHeader(name));
        }
        Enumeration<String> queryNames = req.getParameterNames();
        while (queryNames.hasMoreElements()) {
            String name = queryNames.nextElement();
            parameter.put(name, req.getParameter(name));
        }
        if (((String)header.getOrDefault("Content-Type", "")).contains("json")) {
            ObjectMapper mapper = new ObjectMapper();
            try {
                Map<String, Object> data = mapper.readValue(req.getInputStream(), new TypeReference<Map<String, Object>>(){});
                request.put("data", data);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        request.put("uri", req.getRequestURI());
        request.put("header", header);
        request.put("query", parameter);
        request.put("parameter", parameter);
        return request;
    }

    private static boolean equals(Object mock, Object req) {
        if (mock == null) return true;
        if (req == null) return false;

        if (mock instanceof String) mock.equals(req);
        if (mock instanceof Map) {
            if (!(req instanceof Map)) return false;
            return compareMap((Map)mock, (Map)req);
        }
        if (mock instanceof List) {
            if (!(req instanceof List)) return false;
            return compareList((List)mock, (List)req);
        }

        return mock.toString().equals(req.toString());
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
