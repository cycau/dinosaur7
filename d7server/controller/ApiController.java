package com.cycau.d7server.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api")
public class ApiController {
    @Value("${d7server.devmode}")
    private boolean devmode;
    @Autowired
    private MockData mockData;

    @RequestMapping("/**")
    public ResponseEntity<Object> get(HttpServletRequest request) throws IOException {
    	Map<String, Object> httpRequest = collectRequestData(request);
        if (devmode) {
        	try {
				return mockData.getResponse(request.getMethod(), request.getRequestURI(), httpRequest);
			} catch (IOException e) {
				System.out.println("[ERROR] Something wrong.");
		        return new ResponseEntity<>("Something wrong.", HttpStatus.FORBIDDEN);
			}
        }

        return new ResponseEntity<>("Does not support live mode yet.", HttpStatus.OK);
    }

    private Map<String, Object> collectRequestData(HttpServletRequest req) throws IOException {
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> header = new HashMap<>();
        Map<String, Object> query = new HashMap<>();

        Enumeration<String> headerNames = req.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            header.put(name, req.getHeader(name));
        }
        // query + formData
        Enumeration<String> queryNames = req.getParameterNames();
        while (queryNames.hasMoreElements()) {
            String name = queryNames.nextElement();
            query.put(name, req.getParameter(name));
        }
        if (((String)header.getOrDefault("Content-Type", "")).contains("json")) {
            ObjectMapper mapper = new ObjectMapper();
            try {
                Map<String, Object> data = mapper.readValue(req.getInputStream(), new TypeReference<Map<String, Object>>(){});
                request.put("data", data);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
        	InputStreamReader stream = new InputStreamReader(req.getInputStream());
        	BufferedReader reader = new BufferedReader(stream);
        	String line;
        	StringBuilder result = new StringBuilder();
        	while((line = reader.readLine()) != null) {
        	    result.append(line);
        	}
        	request.put("data", result.toString());
        	reader.close();
        	stream.close();
        }

        request.put("header", header);
        request.put("query", query);
        return request;
    }
}
