<%@ page language="java" contentType="text/html; charset=UTF-8"
   pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ page session="false"%>
<html>
   <head>
      <title>Track Usage</title>
   </head>
   <script type="text/javascript">
      var hits ="${hits}";
        function validateForm(){
			if(document.getElementsByName("url")[0].value.trim().length>0){
				return true;
			}else{
				alert("Please Enter a Url");
				return false;
			}
        }
        
        function validateHits(){
			if(document.getElementsByName("shrinkurl")[0].value.trim().length>0){
				return true;
			}else{
				alert("Please Enter a Url");
				return false;
			}
        }
		
		function popIt(){
			
			window.open("${serverName}${shrinkurl}");
		}
		
   </script>
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
      <h3><i>Total hits for <a href= ${shrinkurl} onClick="popIt(); return false;">${shrinkurl} </a>is ${hits}</h3></i>
      <form action="shrinkurl" onsubmit="return validateForm()" method="post">
          <table>
            <tr>
               <td><Label>Enter a long Url to shrink it:</Label></td>
               <td colspan="2"><input type="text" name="url"></td>
            </tr>
            <tr>
               <td><Label>Custom alias (optional): </Label></td>
               <td><Label>${serverName}</Label></td><td><input type="text" name="customUrl"></td>
            </tr>
            <tr>
               <td><Label>Url Expiry in minutes (optional): </Label></td>
               <td colspan="2"><input type="number" min="1" max="99999" name="expiry"></td>
            </tr>
            <tr>
               <td><Label>Private Url Password (optional): </Label></td>
               <td colspan="2"><input type="password" name="password"></td>
            </tr>
            <tr>
               <td><input type="submit" value="Shrink Url"></td>
            </tr>
        
      </form>
      <form action="trackusage" onsubmit="return validateHits()" method="post">
         
            <tr>
               <td><Label>Enter a Url to get hits:</Label></td>
               <td><Label>${serverName}</Label></td><td><input type="text" name="shrinkurl"></td>
            </tr>
            <tr>
			
               <td><div class="row">
				<input type="submit" value="Get Url Hit Count">
				</div></td>
            </tr>
         </table>
      </form>
   </body>
</html>