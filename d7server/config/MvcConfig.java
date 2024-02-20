package com.cycau.d7server.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
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
	  registry
	  	.addResourceHandler("/**")
		.addResourceLocations("classpath:/public/")
		.setCachePeriod(60*60*24)
		.resourceChain(true)
		.addResolver(resourceRoot.isBlank() ? new SysResourceResolver() : new ExternalResourceResolver(resourceRoot));
  }

  public class SysResourceResolver extends PathResourceResolver {
    @Override
    protected Resource getResource(String resourcePath, Resource location) throws IOException {
      if (resourcePath.indexOf(".") > 0) return super.getResource(resourcePath, location);

      if (resourcePath.endsWith("index")) {
    	  String currPath = resourcePath.substring(0, resourcePath.lastIndexOf("index"));
          InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("public/" + currPath);
          if (is == null) is = ClassLoader.getSystemClassLoader().getResourceAsStream(currPath);
          if (is == null) {
        	  System.out.println("[ERROR] Not found folder. resources/public/" + currPath);
        	  return null;
          }

          BufferedReader br = new BufferedReader(new InputStreamReader(is));
          String fileName = null;
          while ((fileName = br.readLine()) != null) {
        	  if (fileName.startsWith("index.")) break;
          }
          br.close();
          is.close();

          if (fileName == null) return null;
          return super.getResource(currPath + fileName, location);
      }

      if (!resourceIndex.isBlank()) {
          return super.getResource(resourceIndex, location);
      }

      return super.getResource("d7mod/dinosaur7.html", location);
    }
  }

  public class ExternalResourceResolver extends PathResourceResolver {
    private URLClassLoader exResourceLoader;

    public ExternalResourceResolver(String resourceRoot) {
      try {
        exResourceLoader = new URLClassLoader(new URL[]{new File(resourceRoot).toURI().toURL()});
      } catch (Exception e) {
        e.printStackTrace();
        throw new RuntimeException("[ERROR] when loading external resource.");
      }
    }

    @Override
    protected Resource getResource(String resourcePath, Resource location) throws IOException {
      if (resourcePath.indexOf(".") > 0) {
        Resource resource = new ClassPathResource(resourcePath, this.exResourceLoader);
        if (resource.isReadable()) return resource;

        return super.getResource(resourcePath, location);
      }

      if (resourcePath.endsWith("index")) {
    	  String currPath = resourcePath.substring(0, resourcePath.lastIndexOf("index"));
          InputStream is = this.exResourceLoader.getResourceAsStream(currPath);
          if (is == null) {
        	  System.out.println("[ERROR] Not found folder. " + currPath);
        	  return null;
          }

          BufferedReader br = new BufferedReader(new InputStreamReader(is));
          String fileName = null;
          while ((fileName = br.readLine()) != null) {
        	  if (fileName.startsWith("index.")) break;
          }
          br.close();
          is.close();

          if (fileName == null) return null;
          return new ClassPathResource(currPath + fileName, this.exResourceLoader);
      }

      if (!resourceIndex.isBlank()) {
          Resource resource = new ClassPathResource(resourceIndex, this.exResourceLoader);
          if (resource.isReadable()) return resource;

    	  System.out.println("[ERROR] Not found app Index. " + resourceIndex);
          return null;
      }

      return super.getResource("d7mod/dinosaur7.html", location);
    }
  }
}
