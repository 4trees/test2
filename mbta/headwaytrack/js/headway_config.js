//global variable
var m = {t:70,r:50,b:50,l:50},
    w = document.getElementById('canvas').clientWidth,
    h = document.getElementById('canvas').clientHeight;
var plot, bindLine, vehicles, line;

var leftLocation = w*.37;
var rightLocation = w*.63;
var bindWidth = w*.03; // for each track
var interval = 70; // for each stop
var vehicleSize = 28;
var windowHeight = document.body.clientHeight;


var detailBox = document.querySelector('#detailBox')
var alertBt = document.querySelector('#alerts');
var searchBt = document.querySelector('#search');
var configBt = document.querySelector('#config');
var alertCT = document.querySelector('#alertDetail')
var searchCT = document.querySelector('#searchDetail')
var configCT = document.querySelector('#configDetail')
var vehicleBox = document.querySelector('#vehicleBox')
var vehicleCT = document.querySelector('#vehicleDetail')
var dismiss = document.querySelector('.dismiss')

var isOpen = false;
var isAlert = false;
var isVehicle = false;
var isDismiss = false;
var isFullscreen = false;

//buttons on the top
alertBt.addEventListener("click", function(){showDetail(alertCT)} );
searchBt.addEventListener("click", function(){showDetail(searchCT)} );
configBt.addEventListener("click", function(){showDetail(configCT)} );


//close the search/alerts when click on the main diagram
dismiss.addEventListener('click',closeDetail)
//close the search/alerts/vehicle detail when click on the close button
Array.from(document.querySelectorAll('.close')).forEach(function(e){
	e.addEventListener('click',closeDetail)
})

//show the detail box on the top
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

// document.querySelector('body').addEventListener('click',function(e){
// 	if(!isFullscreen){
// 		launchIntoFullscreen(document.documentElement); // the whole page
// 	}
// })


//config sumbit
document.querySelector('.configSubmit').addEventListener('click',function(){
	var lineChecked = document.querySelector('[name=line]:checked')
	var isChecked = lineChecked
	if(isChecked){
		params['line'] = lineChecked.value;
		location.search = paramsToS(params)
		localStorage.setItem('config', params);
		closeDetail()
	}
	
})

//get config from url params or localstorage 
var params = {};
var isConfig = false;
if (location.search) {
	//get params from url
    var parts = location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
        var nv = parts[i].split('=');
        if (!nv[0]) continue;
        params[nv[0]] = nv[1] || true;
    }
    //set value to config form
    document.querySelector('[value=' + params.line).checked = true;
    //update localstorage
    // localStorage.setItem('config', JSON.stringify(params));
}else{
	// if(localStorage.getItem('config')){
	// 	params = JSON.parse(localStorage.getItem('config'));
	// 	console.log(params)
	// 	//update url params
	// 	location.search = paramsToS(params)
	// }else{
		showDetail(configCT)
	// }
}
console.log(params)

if(params.line){isConfig = true}


//generate the search params
function paramsToS(params){
	var searchParams = '';
	Object.keys(params).forEach(function (key, i) {
	    var value = params[key];
	    searchParams = searchParams + (i == 0? '': '&') + key + '=' + value;
	});
	return searchParams
}
