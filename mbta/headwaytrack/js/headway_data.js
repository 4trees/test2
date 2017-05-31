
// URL globals
var stopsurl = "https://api.mbtace.com/stops?route=",
vehiclesurl = "https://api.mbtace.com/vehicles?route=",
predictionsurl = "https://api.mbtace.com/predictions?route=Green-B,Green-C,Green-D,Green-E",
// tripsurl = "https://api.mbtace.com/trips?route=",
alerturl = "https://api.mbtace.com/alerts?route=",
allvehicleurl = "https://api.mbtace.com/vehicles?route=Green-B,Green-C,Green-D,Green-E&include=stop";


var app = angular.module('hdwyApp', []);
app.controller('hdwyCtrl',function($scope, $http, $interval) {
	$scope.stops = [];
	$scope.predictions = [];
	$scope.allStops = [];
	$scope.arrivalTripId = [];
	$scope.arrivalVehicle = [];
	$scope.alerts = [];
	$scope.allPredictions=[];

//get all the stations data
	$scope.getStops = function(){
		$http.get(stopsurl + 'Green-' + configs[0])
		.then(function(response) {
			$scope.stops = response.data.data;			
			angular.forEach($scope.stops, function(stop, k){
			$scope.allStops.push({id:stop.id,name:stop.attributes.name})
			});
			//initial the canvas
			h = $scope.stops.length * interval + 350;
			plot.attr('width', w)
			    .attr('height', h - m.t - m.b)
			    .attr('transform','translate('+ 0+','+ m.t+')');
			//draw stations
			drawStation($scope.stops)
			//scroll page		
			var moveY = getXYFromTranslate(d3.select('.place-'+configs[2])._groups[0][0])[1]
			window.scrollTo(0,moveY - windowHeight / 2)
		});
	};
//get all the vehicles data
	$scope.getVehicles = function(){
		// $http.get(vehiclesurl + 'Green-' + configs[0] + "&include=stop")
		//get all the vehicles
		$http.get(allvehicleurl)
		.then(function(vehicleres) {
			$scope.vehicles = []
			//get all the predictions
			$http.get(predictionsurl)
				.then(function(predictionres) {
					//get the current working station id from TOP BAR
					var stationCode = configs[1];
					//get the prediction data related to the working station
					$scope.allPredictions = predictionres.data.data
						.filter(function(d){return d.relationships.stop.data.id == stationCode})
					//filter the vehicles from prediction's trips and this line
					$scope.allvehicles = vehicleres.data.data.filter(function(d){
						return $scope.allPredictions.find(function(e){return e.relationships.trip.data.id == d.relationships.trip.data.id}) || (d.relationships.route.data.id == ('Green-' + configs[0]))
					})
					angular.forEach($scope.allvehicles,function(vehicle){
						//get the parent station for each vehicle from included data.
						var parentStation = vehicleres.data.included.find(function(d){return d.id == vehicle.relationships.stop.data.id})
						// console.log(parentStation)
						if(parentStation){
							vehicle['parent_station'] = parentStation.relationships.parent_station.data.id;
						}
						//get the arrival_time for each vehicle from predictions
						var arrivalTime = $scope.allPredictions.find(function(d){return d.relationships.trip.data.id == vehicle.relationships.trip.data.id})
						if(arrivalTime){
							vehicle['arrival_time'] = new Date(Date.parse(arrivalTime.attributes.arrival_time));
						}
						$scope.vehicles.push(vehicle)
					})
					// console.log($scope.vehicles)
					//get first 3 next arrivals
					$scope.predictions = $scope.vehicles.filter(function(d){return d.arrival_time}).sort(function(a,b){return a.arrival_time - b.arrival_time;}).slice(0,3);
					//draw the vehicles on the main diagram
					drawVehicles($scope.vehicles)
					replaceMultiVehicles($scope.vehicles)
					//show next arrivals
					showArrivalVehicles($scope.predictions,$scope.allStops)
				})

			// SEARCH 
			d3.select('.searchSubmit').on('click',function(d){
				var searchValue = d3.select('.searchInput')._groups[0][0].value
				//search on local
				var getResults = response.data.data.filter(function(d){return d.attributes.label.includes(searchValue)})
				if(getResults.length == 0){
					//search on server
					$http.get(allvehicleurl)
					.then(function(response) {
						var getStops = response.data.included;
						var getServerResult = response.data.data.filter(function(d){return d.attributes.label.includes(searchValue)})
						if(getServerResult.length == 0){
							d3.select('#searchRT').html('<hr><p class=\'lead\'>Car ' + searchValue +  ' is not being tracked by the real-time system.</p>')
						}else if(getServerResult.length == 1){
							var line = getServerResult[0].relationships.route.data.id;
							var direction = getServerResult[0].attributes.direction_id ? 'westbound' : 'eastbound';
							var status = getServerResult[0].attributes.current_status == 'INCOMING_AT'? 'approaching ' : 'at ';
							var station = getStops.find(function(d){return d.id == getServerResult[0].relationships.stop.data.id}).attributes.name;
							d3.select('#searchRT').html('<hr><p class=\'lead\'>Train ' + searchValue + ' is on ' + line + ' ' + direction + ' ' + status + ' ' + station + '.</p>')
						}else{
							d3.select('#searchRT').html('<hr><p class=\'lead\'>Data error: Train ' + searchValue + ' is listed in more than one place.</p>')
						}
					})
				}else{
				//highlight the vehicle
				//scroll the page to the first vehicle
					var theTrain = d3.select('#train'+getResults[0].id)
					var moveY = getXYFromTranslate(theTrain._groups[0][0])[1]
					window.scrollTo(0,moveY - windowHeight / 2)
				//give color & bg
					var text = theTrain.select('text').classed('highlight',true)
					var textSize = text.node().getBBox();
					theTrain.insert('rect', 'text')
						.attr('class','highlightBG')
						.attr('height',textSize.height + 3)
						.attr('width',textSize.width + 5)
						.attr('transform','translate(' + (textSize.x - 2.5) + ',' + (textSize.y - 1.5) + ')')
						.style('fill',trainColor.find(function(d){return d.branch == getResults[0].relationships.route.data.id}).color)
				}
			})
			
		});
	};

//get alerts data
	$scope.getAlerts = function(){
		$http.get(alerturl + 'Green-' + configs[0])
		.then(function(response) {
			$scope.alerts = response.data.data.filter(function(alert){
				return (alert.attributes.lifecycle != 'Upcoming' && alert.attributes.lifecycle != 'Upcoming-Ongoing') && (alert.attributes.lifecycle == 'Ongoing'? alert.attributes.severity == 'Severe':alert)
			})
			//show alert icon only when alerts exist
			var alert = d3.select('#alerts')
			if($scope.alerts.length > 0 ){
				if(alert){
					alert.classed('hidden', false)					
				}
				showAlerts($scope.alerts)
				
				drawAlertIcon($scope.alerts.length)
			}else{
				if(alert){
					alert.classed('hidden',true)
				}				
			}
		})
	}
//show the clock on TOP BAR section
	$scope.timeNow = function(){
		d3.select('#nowTime').html(getTime()[0]);
		d3.select('#ap').html(getTime()[1]);
	}

if(isConfig){
	//get the config
	var configs = params.split('-')
	// Initial
	$scope.timeNow();
	$scope.getStops();
	$scope.getVehicles();
	$scope.getAlerts();
	// Update
	$interval(function(){
		$scope.timeNow();
	},1000)
	$interval(function() {    
		$scope.getVehicles();
		$scope.getAlerts();
	}, 10000);
}else{
	showDetail(configCT)
}

});
//get the trip id from prediction data
function getTripId(data){
	return data.map(function(el){
		return el.relationships.trip.data.id
	})
}

//draw routes
function drawRoutes(position, length){
var location = position == 'right'? rightLocation : leftLocation;
//green routes
line.append('rect')
	.attr('class','bind')
	.attr('x',location)
	.attr('width',bindWidth)
	.attr('y',interval)
	.attr('height',(length - 1) * interval)
//direction arrows
var arrows = line.append('g')
var count = 4 // the count of arrow between stops
for(i=0;i<(length -1)*count;i++){
	if(i%count){
		arrows.append('line')
			.attr('x1',location)
			.attr('y1',interval + interval / count * i)
			.attr('x2',location + bindWidth / 2)
			.attr('y2',interval + interval / count * i + bindWidth / 2)
			.attr('class','triangle')
			.attr('transform','translate(' + (position == 'right'? bindWidth / 2 : 0) + '0)')
		arrows.append('line')
			.attr('x2',location + bindWidth)
			.attr('y2',interval + interval / count * i)
			.attr('x1',location + bindWidth / 2)
			.attr('y1',interval + interval / count * i + bindWidth / 2)
			.attr('class','triangle')
			.attr('transform','translate(' + (position == 'right' ? -bindWidth / 2 : 0) + '0)')
	}
}
}
//draw stations on the routes on main diagram
function drawStation(data){
data.reverse();
//draw station and route based on dirction
var length = data.length;
drawRoutes('right',length)
drawRoutes('left',length)
var update = line.selectAll('.stop')
	.data(data,function(d){return d.id})
var enter = update.enter()
	.append('g')
	.attr('class',function(d){return 'stop '+d.id})
	.attr('transform',function(d,i){return 'translate('+0 + ',' + (i + 1) * interval + ')'})
enter.append('circle')
	.attr('r',function(d,i){return i == 0 || i == length - 1?bindWidth - 6:(bindWidth - 6) / 2})
	.attr('class',function(d,i){return i == 0 || i == length - 1?'terminalStop' : 'middleStop'})
	.attr('cx',leftLocation + bindWidth / 2)
enter.append('circle')
	.attr('r',function(d,i){return i == 0 || i == length - 1?bindWidth - 6:(bindWidth - 6) / 2})
	.attr('class',function(d,i){return i == 0 || i == length - 1?'terminalStop' : 'middleStop'})
	.attr('cx', rightLocation + bindWidth / 2)
enter.append('text')
	.text(function(d){return d.attributes.name.trunc(15)})
	.attr('class','stationName')
	.attr('x',(rightLocation + leftLocation + bindWidth) / 2)
update.exit().remove();
}

//draw vehicles on main diagram
function drawVehicles(data){
vehicles.selectAll('.multiple').remove()
vehicles.selectAll('.vehicle').classed('hidden',false)
var update = vehicles.selectAll('.vehicle')
	.data(data,function(d){return d.id})

var enter = update.enter()
	.append('g')
	.attr('class','vehicle')
	.attr('id',function(d){return 'train' + d.id})
	.attr('data-location',function(d){return d.attributes.current_status + '-' + d.relationships.stop.data.id + '-' + d.attributes.direction_id + '-' + d.relationships.route.data.id})
	.on('click',function(d){var n = [];n[0] = d;return showVehicle(n)})
	.attr('transform',function(d){
		var station = getXYFromTranslate(d3.select('.'+d.parent_station)._groups[0][0]);
		var Y = station[1];
		var X = d.attributes.direction_id == 1 ? (rightLocation + 2 * bindWidth) : (leftLocation - 1 * bindWidth);
		var offsetY = offsetX = 0;
		if(d.attributes.current_status == 'INCOMING_AT'){
			//check if the train is turning around at a terminal stop
			var ifToTerminal = terminals.find(function(t){return t.stop_id == d.relationships.stop.data.id})
			if(ifToTerminal && (ifToTerminal.direction_id != d.attributes.direction_id)){
				offsetY = interval * (d.attributes.direction_id == 1? -1 : 1) * .45;
				offsetX = (d.attributes.direction_id == 1 ? -1 : 1) * ((rightLocation - leftLocation) / 2 + 3 * bindWidth);
			}else{
				offsetY = (d.attributes.direction_id == 1 ? 1 : -1) * interval / 2;
			}
		}
		return 'translate(' + (X + offsetX) + ',' + (Y + offsetY) + ')';
	})
enter.append('svg:image')
	.attr("xlink:href",function(d){return "images/"+ d.relationships.route.data.id + ".png"})
	.attr('width', vehicleSize)
    .attr('height', vehicleSize)
    .attr('x',-vehicleSize/2)
    .attr('y',-vehicleSize/2)
enter.append('text').text(function(d){return d.attributes.label})
	.attr('class','vehicleNum')
	.style('fill',function(d){return trainColor.find(function(e){return e.branch == d.relationships.route.data.id}).color})

update.merge(enter)
	.attr('data-location',function(d){return d.attributes.current_status + '-' + d.relationships.stop.data.id + '-' + d.attributes.direction_id + '-' + d.relationships.route.data.id})
	.transition()
	.attr('transform',function(d){
		var station = getXYFromTranslate(d3.select('.' + d.parent_station)._groups[0][0]);
		var Y = station[1];
		var X = d.attributes.direction_id == 1? (rightLocation + 2 * bindWidth) : (leftLocation - 1 * bindWidth);
		var offsetY = offsetX = 0;
		if(d.attributes.current_status == 'INCOMING_AT'){
			//check if the train is turning around at a terminal stop
			var ifToTerminal = terminals.find(function(t){return t.stop_id == d.relationships.stop.data.id})
			if(ifToTerminal && (ifToTerminal.direction_id != d.attributes.direction_id)){
				offsetY = interval * (d.attributes.direction_id == 1 ? -1 : 1) * .45;
				offsetX = (d.attributes.direction_id == 1? -1 : 1) * ((rightLocation - leftLocation) / 2 + 3 * bindWidth);
			}else{
				offsetY = (d.attributes.direction_id == 1? 1 : -1) * interval / 2;
			}
		}
		return 'translate(' + (X + offsetX) + ',' + (Y + offsetY) + ')';
	})
	.select('text')
	.attr('x',function(d){return (d.attributes.direction_id == 0? -1 : 1) * vehicleSize / 2})
	.style('text-anchor',function(d){return d.attributes.direction_id == 0? 'end' : 'start'})

update.exit().remove();
}

//when multiple trans, hidden them and draw a grouped train 
function replaceMultiVehicles(data){
var allLocation = d3.set();
data.forEach(function(vehicle){
	var attr = vehicle.attributes.current_status + '-' + vehicle.relationships.stop.data.id + '-' + vehicle.attributes.direction_id + '-' + vehicle.relationships.route.data.id
	 if( !allLocation.has(attr) ){
        allLocation.add(attr);
    }
})
allLocation.values().forEach(function(location){
	var findMulti = Array.from(document.querySelectorAll('[data-location=' + location + ']'))
	var count = findMulti.length
	console.log(count)
	if(count > 1){		
		var locationdata = location.split('-')
		var multidata = data.filter(function(d){return (d.attributes.current_status == locationdata[0]) && (d.relationships.stop.data.id == locationdata[1]) && (d.attributes.direction_id == locationdata[2])})
		//hidden the multiple trains
		Array.from(findMulti).forEach(function(multi){
			multi.classList.add('hidden')
		})
		// //show multiicon
		var updatamulti = vehicles
			.append('g')
			.attr('id',location).attr('class','multiple')
			.attr('transform','translate(' + getXYFromTranslate(findMulti[0])[0] + ',' + getXYFromTranslate(findMulti[0])[1] + ')')
			.on('click',function(){showVehicle(multidata)})
			.selectAll('multiple')
			.data(multidata)
			.enter()
			.append('svg:image')
				.attr("xlink:href",function(d){return "images/"+ d.relationships.route.data.id + ".png"})
				.attr('width', vehicleSize)
			    .attr('height', vehicleSize)
			    .attr('x', function(d,i){return (locationdata[2] == 0? -1 : 1) * i * vehicleSize - vehicleSize / 2})
			    .attr('y', -vehicleSize / 2)
	}
})
}
//show vehicle's information when click on the icon of it
function showVehicle(data){
	//open the dismiss area when open the search/alerts
	dismiss.classList.remove('hidden');isDismiss = true;
	vehicleBox.classList.add('openBox');
	vehicleCT.innerHTML = 
		data.map(function(d){
			return '<p class=\'lead\'>Train '+ d.attributes.label + (d.arrival_time ? (' will arrive at '+getTime(d.arrival_time)[0]+getTime(d.arrival_time)[1]) : '') + '.</p>';
		}).join('')
	isVehicle = true;
}

//show the next arrivals' vehicle label and location
function showArrivalVehicles(nextarrivals,allStops){
	// console.log(nextarrivals.length)
	if(nextarrivals != '' && allStops != ''){
		document.querySelector('#arrivalTime').innerHTML = 
			nextarrivals.map(function(arrival) {
			var time = getTime(arrival.arrival_time);
    		return '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p class=\"arrivalTime\">' + time[0] + '<span class=\"ap\">' + time[1] + '</span></p></div>';
    	}).join('');
		document.querySelector('#arrivalVehicle').innerHTML =
			nextarrivals.map(function(arrival) {
    		return '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p><span class=\"vehicleCode\" style=\"color:' + trainColor.find(function(d){return d.branch == arrival.relationships.route.data.id}).color + '\">' + arrival.attributes.label + '</span></p></div>'
    	}).join('') + '<hr class="arrivals">';
		document.querySelector('#arrivalLocation').innerHTML = 
			nextarrivals.map(function(arrival) {
			var name = allStops.find(function(d){return d.id == arrival.parent_station}).name;
    		return  '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p><span class=\"text-darker\">' + (arrival.attributes.current_status == 'INCOMING_AT'? 'approaching ' : 'at ' ) + '</span><span>' + name + '</span></p></div>'
    	}).join('');
	}
}
//show alerts
function showAlerts(data){
	document.querySelector('#alertDetail').innerHTML = 
		data.map(function(alert){
			return 	'<div id=alert' + alert.id + '><h5 class=\"alertTitle\"><strong>' + alert.attributes.effect_name + ':&nbsp;</strong>' + alert.attributes.short_header + '</h5>' + (alert.attributes.description ? ('<p class=\"alertDes hidden\">' + alert.attributes.description + '</p><p class=\"viewMore\"><a>View More Detail&nbsp;<i class="fa fa-angle-right" aria-hidden="true"></i></a></p>'):('')) + '<p class=\"text-darker\">Last Updated: ' + getDate(alert.attributes.updated_at) + '</p></div>';
		}).join('') 

	//when click the detail of X alert, close other details of alerts.
	var alerts = document.querySelectorAll('.viewMore');
	Array.from(alerts).forEach(function(alert){
		alert.addEventListener('click',function(){
			var active = this.parentElement.id
			Array.from(document.querySelectorAll('.alertDes')).forEach(function(d){
				if(d.parentElement.id == active){
					d.classList.remove('hidden')
				}else{
					d.classList.add('hidden') 
				}
			})
			Array.from(alerts).forEach(function(d){
				if(d.parentElement.id == active){
					d.classList.add('hidden')
				}else{
					d.classList.remove('hidden') 
				}
			})
		})
	})

}
//draw alerts icon
function drawAlertIcon(count){
	var svgBox = document.querySelector('.alertImg')
	if(svgBox.childElementCount){
		d3.select('.alertImg').select('svg').select('text').text(count)
	}else{	
		var svg = d3.select('.alertImg').append('svg')
			.attr('viewBox','0 0 ' + 110 +' ' + 110)
			.attr('width',svgBox.clientWidth)
			.attr('height',svgBox.clientHeight)
		svg.append('path')
			.attr('d','M84.18,41.34l-3.42.46C80.61,26,73.21,14.52,59.34,7.34a37,37,0,0,0-30-2.08C9,12.23-2,35,5.3,55.14,11.76,73,32.57,88.68,58.91,77.48L60,80.57A36.58,36.58,0,0,1,46.57,84.1c-7,.39-13.92.05-20.55-2.7A42.41,42.41,0,0,1,10.07,69.55,39.54,39.54,0,0,1,1.74,54.66,44.81,44.81,0,0,1,.14,38.6a41.54,41.54,0,0,1,4.07-15A40.25,40.25,0,0,1,12,12.5C17.87,6.68,24.71,2.49,32.9.85a46.15,46.15,0,0,1,16-.29c11.91,1.8,21,8.13,27.88,17.81A40.89,40.89,0,0,1,83.87,36.7C84.08,38.23,84.08,39.8,84.18,41.34Z')
			.style('fill','#fff')
		svg.append('path')
			.attr('d', 'M69.24,34.66H48.86V68.78H34.35V34.7H14.79v-12H69.24Z')
			.style('fill','#fff')
		svg.append('path')
			.attr('d','M85.73,94a24.65,24.65,0,1,1,24.72-24.54A24.74,24.74,0,0,1,85.73,94Z')
			.style('fill','#FFD852')
		svg.append('text').text(count).attr('transform','translate(75,80)')
			.style('font-size','1.6em')
			.style('stroke',10)
	}
}

// get the coordinates of stops
function getXYFromTranslate(element){
	var x,y;
	if(element){
		var split = element.getAttribute('transform').split(',');
    	x = +split[0].split("(")[1];
    	y = +split[1].split(")")[0];
	}else{
		x = -100;
		y = -100;
	}

    return [x, y];
} 


function getTime(datestring) {
var time = [];
if(datestring){
	var msec = Date.parse(datestring);
	var d = new Date(msec);
}else{
	d = new Date()
}
var	timing = (d.getHours() >12? -12 : 0 ) + d.getHours() + ' : ' + (d.getMinutes() <10? '0': '') + d.getMinutes() + ' : ' + (d.getSeconds() <10? '0':'') + d.getSeconds(),
	ap = d.getHours() >=12? ' PM':' AM';
	time.push(timing,ap)
	return time
}
function getDate(datestring){
	var d = new Date(Date.parse(datestring));
	var date = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + (d.getHours() >12? -12 : 0 ) + d.getHours() + ':' + (d.getMinutes() <10? '0': '') +d.getMinutes() + (d.getHours() >=12? ' PM':' AM');
	return date
}


function distance(lat1, lon1, lat2, lon2) {
  var p = Math.PI / 180;
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}