//global variable
var m = {t:70,r:50,b:50,l:50},
	w = document.getElementById('canvas').clientWidth;
var h,//set the height when get the stops data
	plot = d3.select('svg'),
	bindLine = plot.select('.lineContainer'),
	vehicles = plot.select('.vehicleContainer'),
	line = bindLine.append('g');

var leftLocation = w * .37;
var rightLocation = w * .63;
var bindWidth = w * .03; // for each track
var interval = 70; // for each stop
var vehicleSize = 28;
var windowHeight = window.innerHeight;


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
var activeContent = '';
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
	//if is open, then close, otherwise, open.
	if(activeContent == target.id){
		detailBox.classList.remove('openBox');
		activeContent = '';
	}else{
		detailBox.classList.add('openBox');
		activeContent = target.id;
		//set the content
		var contents = document.querySelectorAll('.content')
		Array.from(contents).forEach(function(content){
			if(content.id == target.id){
				content.classList.add('showDetail')
			}else{
				content.classList.remove('showDetail')
			}
		})
		isOpen = true;
	}

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
var configoption = Array.from(document.querySelectorAll('[name=line]'))

configoption.forEach(function(option){
	option.addEventListener('click',function(){
		params = option.value
		location.search = paramsToS(params)
		localStorage.setItem('config', params);
		closeDetail()		
	})
})

//trunc the long word: for station name on the top right
String.prototype.trunc = String.prototype.trunc ||
    function(n){
        return (this.length > n) ? this.substr(0, n-1) + '...' : this;
    };

//get config from url params 
var params;
var isConfig = false;
if (location.search) {
	//get params from url
    var params = location.search.substring(1).split('&')[0].split('=')[1]
    //set value to config form
    var selectedOption = document.querySelector('[value=' + params+']')
    selectedOption.checked = true;
    document.querySelector('#station').innerHTML = selectedOption.nextSibling.textContent.trunc(10);
}else{
	showDetail(configCT)
}

if(params){isConfig = true}


//generate the search params
function paramsToS(params){
	var searchParams = 'line=' + params;
	return searchParams
}


//color for trains
trainColor = [
{branch:'Green-B',color:'#FF5244'},
{branch:'Green-C',color:'#4DFF4D'},
{branch:'Green-D',color:'#FCD03E'},
{branch:'Green-E',color:'#4D96F5'}
]

