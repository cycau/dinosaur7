package com.cycau.d7server.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api")
public class ApiController {
    @Value("${d7server.devmode}")
    private boolean devmode;
    @Value("${d7server.resource.root}")
    private String resourceRoot;

    @GetMapping("/**")
    public ResponseEntity<Object> get(HttpServletRequest request) {
        if (devmode) return MockData.getResponse(request);

        return new ResponseEntity<>("Not support live mode yet.", HttpStatus.OK);
    }
}
