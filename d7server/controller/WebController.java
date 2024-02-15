package com.cycau.d7server.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpServletResponse;

@Controller
public class WebController {

    @GetMapping("/d7app/htmlall")
    public void allhtml(HttpServletResponse response) {
        // TODO compiled html set
    }

    @GetMapping("/d7app/html/**")
    public void html(HttpServletResponse response) {
        
    }

    @GetMapping("/d7app/image/**")
    public void image(HttpServletResponse response) {
        // TODO resize image
    }

}
