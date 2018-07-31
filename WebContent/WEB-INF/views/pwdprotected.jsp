<%@ page language="java" contentType="text/html; charset=UTF-8"
   pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ page session="false"%>
<html>
   <head>
      <title>Password Protected</title>
   </head>
   <style>
* {
    box-sizing: border-box;
}



input[type=password], select, textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: vertical;
	background: ghostwhite;
}
input[type=number], select, textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: vertical;
	background: ghostwhite;
}
input[type=text], select, textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: vertical;
	background: ghostwhite;
}

label {
    padding: 12px 12px 12px 0;
    display: inline-block;
}
body{
	margin: 30px;
}

input[type=submit] {
    background-color: #4CAF50;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    float: left;
}

input[type=submit]:hover {
    background-color: #45a049;
}


@media screen and (max-width: 600px) {
    .col-25, .col-75, input[type=submit] {
        width: 100%;
        margin-top: 0;
    }
}
</style>
   <body>
      <form action="pwdprotected" method="post">
         <table>
            <tr>
               <td><Label>Please Enter password</Label></td>
               <td>
                  <input type="password" name="pwd">
                  <input type="hidden" id="url" name="url" value=${shrinkurl}>
               </td>
            </tr>
            <tr>
               <td><input type="submit" value="Open Url"></td>
            </tr>
         </table>
      </form>
   </body>
</html>