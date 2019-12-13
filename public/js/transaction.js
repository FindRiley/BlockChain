/**
 * 
 * @authors Your Name (you@example.org)
 * @date    2019-12-12 13:45:54
 * @version $Id$
 */

window.onload=function(){
  var box_hight;  
  var box_width; 
  var con=document.getElementById("container");
  
  //位置赋值
  con.style.left="50%";
  con.style.top="50%";
  box_width=con.offsetWidth;  //获取盒子宽度
  box_hight=con.offsetHeight;  //获取盒子高度
  con.style.marginTop=-box_hight/2+"px";
  con.style.marginLeft=-box_width/2+"px";
}