var m = {t:50,r:50,b:50,l:50},
    w = document.getElementById('canvas').clientWidth,
    h = document.getElementById('canvas').clientHeight;
console.log(w,h)
var plot = d3.select('svg')
    // .append('svg')
    .attr('width', w)
    .attr('height', h - m.t - m.b)
    .attr('transform','translate('+ 0+','+ m.t/2+')');


var leftLocation = w*.37;
var rightLocation = w*.63;
var bindWidth = w*.03;
var interval = 100;
var vehicleSize = 2;
var windowHeight = document.body.clientHeight;


var bindLine = plot.select('.lineContainer')
var vehicles = plot.select('.vehicleContainer')


var detailBox = document.querySelector('#detailBox')
var alertBt = document.querySelector('#alerts');
var searchBt = document.querySelector('#search');
var alertCT = document.querySelector('#alertDetail')
var searchCT = document.querySelector('#searchDetail')
var vehicleBox = document.querySelector('#vehicleBox')
var vehicleCT = document.querySelector('#vehicleDetail')
var dismiss = document.querySelector('.dismiss')


var isOpen = false;
var isAlert = false;
var isVehicle = false;
var isDismiss = false;
var isFullscreen = false;

alertBt.addEventListener("click", function(){showDetail(alertCT)} );
searchBt.addEventListener("click", function(){showDetail(searchCT)} );
function showDetail(target){
	//open the dismiss area when open the search/alerts
	dismiss.classList.remove('hidden');isDismiss = true;
	//close the detail of vehicle when open search/alerts
	vehicleBox.classList.remove('openBox')
	isVehicle = false;
	detailBox.classList.add('openBox')
	//get the function content refers to click button
	var contents = document.querySelectorAll('.content')
	Array.from(contents).forEach(function(content){
		if(content.id == target.id){
			content.classList.add('showDetail')
		}else{
			content.classList.remove('showDetail')
		}
	})
	isOpen = true;
};
//close the search/alerts when click on the main diagram
dismiss.addEventListener('click',closeDetail)
//close the search/alerts/vehicle detail when click on the close button
Array.from(document.querySelectorAll('.close')).forEach(function(e){
	e.addEventListener('click',closeDetail)
})
	
function closeDetail(){
	//close all
	dismiss.classList.add('hidden');isDismiss = false;
	detailBox.classList.remove('openBox');isOpen = false;
	vehicleBox.classList.remove('openBox');isVehicle = false;
	//cancel the search highlight
	if(document.querySelector('.highlight')){
		document.querySelector('.highlight').classList.remove('highlight')
		document.querySelector('.highlightBG').remove()
	}

}

//full screen
function launchIntoFullscreen(element) {
  if(element.requestFullscreen) {
    element.requestFullscreen();
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if(element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

document.querySelector('body').addEventListener('click',function(e){
	if(!isFullscreen){
		launchIntoFullscreen(document.documentElement); // the whole page
	}
})

