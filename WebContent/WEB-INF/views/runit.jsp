<%@ page language="java" contentType="text/html; charset=UTF-8"
   pageEncoding="UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
   <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Redirect</title>
   </head>
   <script type="text/javascript">
      var shrinkurl ="${shrinkurl}";
      setInterval(function(){ window.location = shrinkurl; }, 300000);
      
   </script>
</html>