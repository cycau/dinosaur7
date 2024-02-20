package com.cycau.d7server.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpServletResponse;

@Controller
public class ViewController {
	@Value("${d7server.resource.index}")
	private String resourceIndex;

	@RequestMapping("/")
    public String home() {
    	if (resourceIndex.isBlank()) {
    		return "d7mod/dinosaur7.html";
    	}
        return resourceIndex;
    }

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
