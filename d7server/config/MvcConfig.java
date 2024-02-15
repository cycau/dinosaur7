package com.cycau.d7server.config;

import java.io.IOException;
import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class MvcConfig implements WebMvcConfigurer {
  @Value("${d7server.resource.root}")
  private String resourceRoot;
  @Value("${d7server.resource.index}")
  private String resourceIndex;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/public/")
            .setCachePeriod(60*60*24)
            .resourceChain(true)
            .addResolver(resourceRoot.isBlank() ? new SysResourceResolver() : new D7ResourceResolver(resourceRoot));
  }

  public class SysResourceResolver extends PathResourceResolver {
    @Override
    protected Resource getResource(String resourcePath, Resource location) throws IOException {
      if (resourcePath.indexOf(".") > 0) return super.getResource(resourcePath, location);

      Resource resource = super.getResource(resourceIndex, location);
      if (resource != null) return resource;
      resource = super.getResource("index.html", location);
      if (resource != null) return resource;
      resource = super.getResource("index.jsp", location);
      return resource;
    }
  }

  public class D7ResourceResolver extends PathResourceResolver {
    private URLClassLoader d7ResourceLoader;

    public D7ResourceResolver(String resourceRoot) {
      try {
        d7ResourceLoader = new URLClassLoader(new URL[]{new File(resourceRoot).toURI().toURL()});
      } catch (Exception e) {
        e.printStackTrace();
        throw new RuntimeException(e);
      }
    }

    @Override
    protected Resource getResource(String resourcePath, Resource location) throws IOException {
      if (resourcePath.indexOf(".") > 0) {
        Resource resource = new ClassPathResource(resourcePath, this.d7ResourceLoader);
        if (resource.isReadable()) return resource;
        return super.getResource(resourcePath, location);
      }

      Resource resource = new ClassPathResource(resourceIndex, this.d7ResourceLoader);
      if (resource.isReadable()) return resource;
      resource = super.getResource(resourceIndex, location);
      if (resource != null) return resource;

      resource = new ClassPathResource("index.html", this.d7ResourceLoader);
      if (resource.isReadable()) return resource;
      resource = new ClassPathResource("index.jsp", this.d7ResourceLoader);
      if (resource.isReadable()) return resource;
      return null;
    }
  }
}
