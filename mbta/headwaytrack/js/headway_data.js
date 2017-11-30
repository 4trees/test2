// URL globals
var stopsurl = `https://${apiVerstion}api.mbtace.com/stops?route=`,
    vehiclesurl = `https://${apiVerstion}api.mbtace.com/vehicles?route=`,
    predictionsurl = `https://${apiVerstion}api.mbtace.com/predictions?stop=`,
    // tripsurl = "https://api.mbtace.com/trips?route=",
    alerturl = `https://${apiVerstion}api.mbtace.com/alerts?route=`,
    allvehicleurl = `https://${apiVerstion}api.mbtace.com/vehicles?route=Mattapan,Green-B,Green-C,Green-D,Green-E&include=stop`;


var app = angular.module('hdwyApp', []);
app.controller('hdwyCtrl', function($scope, $http, $interval) {
    $scope.stops = [];
    $scope.predictions = [];
    $scope.allStops = [];
    $scope.arrivalTripId = [];
    $scope.arrivalVehicle = [];
    $scope.alerts = [];
    $scope.allPredictions = [];


    //get all the stations data
    $scope.getStops = function() {
        // console.log(nowLines)
        var getLines = nowLines.includes('Mattapan') ? 'Mattapan' : nowLines.join(',')

        $http.get(stopsurl + getLines)
            .then(function(response) {

                    angular.forEach(response.data.data, function(stop, k) {
                        $scope.allStops.push({ id: stop.id, name: stop.attributes.name })
                    });

                    if (nowLines.length == 1) {
                        console.log('get 1 line')
                        $scope.stops = response.data.data;
                        //initial the canvas

                        h = $scope.stops.length * interval + 350;
                        plot.attr('width', w)
                            .attr('height', h - m.t - m.b)
                        //draw stations

                        drawStation($scope.stops)
                        //scroll page       
                        var moveY = getXYFromTranslate(d3.select('.place-' + configs[2])._groups[0][0])[1]
                        window.scrollTo(0, moveY - windowHeight / 2)
                    } else {
                        console.log('get 4 lines')
                        //$http.get(stopsurl + 'Green-B') change to 'Green-C' as below
                        $http.get(stopsurl + 'Green-C')
                            .then(function(truncRes) {
                                console.log(truncRes.data.data)
                                var kenmore = truncRes.data.data.map(function(d) { return d.id }).indexOf('place-kencl')
                                var northStation = truncRes.data.data.map(function(d) { return d.id }).indexOf('place-north')
                                $scope.stops = truncRes.data.data.slice(kenmore, northStation + 1);
                                console.log(kenmore, northStation, $scope.stops)
                                //initial the canvas

                                h = $scope.stops.length * interval + 350;
                                console.log(interval)
                                plot.attr('width', w)
                                    .attr('height', h - m.t - m.b)
                                //draw stations
                                drawStation($scope.stops)
                                //scroll page       
                                var moveY = getXYFromTranslate(d3.select('.place-' + configs[2])._groups[0][0])[1]
                                window.scrollTo(0, moveY - windowHeight / 2)
                                $scope.getVehicles()
                            }, function(err) {
                                updating(err)
                            })
                    }

                },
                function(err) {
                    updating(err)
                });
    };
    //get all the vehicles data
    $scope.getVehicles = function() {

        //get all the vehicles
        $http.get(allvehicleurl)
            .then(function(vehicleres) {
                if (vehicleres.status == 200) {
                    updating()
                }
                $scope.vehicles = []

                $scope.allvehicles = vehicleres.data.data.filter(function(d) { return nowLines.includes(d.relationships.route.data.id) })
                if(nowLines.length > 1){
                    $scope.allvehicles = $scope.allvehicles
                    .filter(function(d) { return !(['70150', '70206'].includes(d.relationships.stop.data.id) && ['INCOMING_AT', 'IN_TRANSIT_TO'].includes(d.attributes.current_status)) })
                }
                
                //get all the predictions
                $http.get(predictionsurl + 'place-' + nowArrivalStationCode)
                    .then(function(predictionres) {
                        $scope.predictions = []
                        //get the current working station id from TOP BAR
                        var stationCode = nowArrivalStationCode;

                        //get the prediction data related to the working station
                        $scope.allPredictions = predictionres.data.data.filter(function(d) { return d.attributes.arrival_time || d.attributes.departure_time })

                        angular.forEach($scope.allvehicles, function(vehicle) {
                            //get the parent station for each vehicle from included data.
                            var parentStation = vehicleres.data.included.find(function(d) { return d.id == vehicle.relationships.stop.data.id })
                            // console.log(parentStation)
                            if (parentStation) {
                                vehicle['parent_station'] = parentStation.relationships.parent_station.data.id;
                            }

                            var arrivalData = $scope.allPredictions.find(function(e) { return e.relationships.trip.data.id == vehicle.relationships.trip.data.id })
                            //get the arrival_time and arrival_stop for each vehicle from predictions 

                            if (arrivalData) {
                                vehicle['arrival_time'] = arrivalData.attributes.arrival_time || arrivalData.attributes.departure_time;

                            }
                            $scope.vehicles.push(vehicle)
                        })
                       
                        //update the title of NEXT ARRIVALS SECTION
                        if ($scope.allStops.length != 0) {
                            var arrivalName = $scope.allStops.find(function(stop) { return stop.id == 'place-' + stationCode }).name;
                            var arrivalDirection = nowArrivalStationDirection == 0 ? 'Westbound' : 'Eastbound';
                            document.querySelector('#newArrivalsTitle').innerHTML = 'Next arrivals at ' + arrivalName + ' - ' + arrivalDirection;
                        } else {
                            $scope.getStops();
                            $scope.getVehicles()
                        }

                        //get first 3 next arrivals of the assigned stop
                        $scope.predictions = $scope.vehicles
                            .filter(function(d) { return d.arrival_time && (d.attributes.direction_id == nowArrivalStationDirection) })
                            .sort(function(a, b) { return Date.parse(a.arrival_time) - Date.parse(b.arrival_time) })
                            .slice(0, 3)

                        //show next arrivals
                        showArrivalVehicles($scope.predictions, $scope.allStops)

                        //draw the vehicles on the main diagram
                        var showingVehicleList = $scope.stops.map(function(d) { return d.id })

                        var showingVehicle = $scope.vehicles.filter(function(d) { return showingVehicleList.includes(d.parent_station) })
                        drawVehicles(showingVehicle, arrivalName)
                        replaceMultiVehicles(showingVehicle, arrivalName)


                    }, function(err) {
                        updating(err)
                    })

                // SEARCH 
                d3.select('.searchSubmit').on('click', function(d) {
                    d3.select('#searchRT').html('')
                    removeHighlight()
                    var searchValue = d3.select('.searchInput')._groups[0][0].value
                    //search on local
                    var getResults = $scope.vehicles.filter(function(d) { return d.attributes.label.includes(searchValue) })
                    if (getResults.length == 0) {
                        //search on server
                        $http.get(allvehicleurl)
                            .then(function(response) {
                                var getStops = response.data.included;
                                var getServerResult = response.data.data.filter(function(d) { return d.attributes.label.includes(searchValue) })
                                if (getServerResult.length == 0) {
                                    d3.select('#searchRT').html('<hr><p class=\'lead\'>Car ' + searchValue + ' is not being tracked by the real-time system.</p>')
                                } else if (getServerResult.length == 1) {
                                    var trainlabel = getServerResult[0].attributes.label;
                                    var line = getServerResult[0].relationships.route.data.id;
                                    var direction = getServerResult[0].attributes.direction_id == 0? 'westbound' : 'eastbound';
                                    var status = ['INCOMING_AT', 'IN_TRANSIT_TO'].includes(getServerResult[0].attributes.current_status) ? 'approaching ' : 'at ';
                                    var station = getStops.find(function(d) { return d.id == getServerResult[0].relationships.stop.data.id }).attributes.name;
                                    d3.select('#searchRT').html('<hr><p class=\'lead\'>Train ' + trainlabel + ' is on ' + line + ' ' + direction + ' ' + status + ' ' + station + '.</p>')
                                } else {
                                    d3.select('#searchRT').html('<hr><p class=\'lead\'>Data error: Train ' + searchValue + ' is listed in more than one place.</p>')
                                }
                            }, function(err) {
                                updating(err)
                            })
                    } else {
                        //highlight the vehicle
                        //scroll the page to the first vehicle
                        ishighlight = getResults[0].id

                        var theTrains = d3.selectAll('.train' + ishighlight)
                        console.log(theTrains.node())
                        var moveY = getXYFromTranslate(theTrains._groups[0][0])[1]
                        window.scrollTo(0, moveY - windowHeight / 2)
                        //give color & bg
                        theTrains.each(function(d) {

                            this.classList.add('highlight')
                            this.querySelector('rect').classList.add('highlightBG');

                        })
                        //close the search box
                        closeDetail()
                    }
                })

            }, function(err) {
                updating(err)
            });
    };

    //get alerts data
    $scope.getAlerts = function() {
        var getLines = nowLines.includes('Mattapan') ? 'Mattapan' : nowLines.join(',')
        $http.get(alerturl + getLines)
            .then(function(response) {
                $scope.alerts = response.data.data.filter(function(alert) {
                    return (alert.attributes.lifecycle != 'Upcoming' && alert.attributes.lifecycle != 'Upcoming-Ongoing') && (alert.attributes.lifecycle == 'Ongoing' ? alert.attributes.severity == 'Severe' : alert)
                })
                //show alert icon only when alerts exist
                var alert = d3.select('#alerts')
                if ($scope.alerts.length > 0) {
                    if (alert) {
                        alert.classed('hidden', false)
                    }
                    showAlerts($scope.alerts)

                    drawAlertIcon($scope.alerts.length)
                } else {
                    if (alert) {
                        alert.classed('hidden', true)
                    }
                }
            })
    }
    //show the clock on TOP BAR section
    $scope.timeNow = function() {
        var time = getTime()
        d3.select('#nowTime').html(time[0] + time[1]);
        d3.select('#ap').html(time[2]);
    }


    if (isConfig) {
        //get the config
        configs = params.split('-')
        nowArrivalStationCode = configs[2];
        nowArrivalStationDirection = configs[3];
        nowArrivalStationId = configs[1];
        nowLines = configs[0] == 'Mattapan' ? [configs[0]] : configs[0].split('').map(function(d) { return 'Green-' + d })

        // Initial
        interval = nowLines.length > 1 ? interval * 1.5 : interval;
        $scope.timeNow();
        $scope.getStops();

        $scope.getVehicles();
        $scope.getAlerts();
        // Update
        $interval(function() {
            $scope.timeNow();
        }, 1000)
        $interval(function() {
            $scope.getVehicles();
            $scope.getAlerts();
        }, 10000);
        // set the function for click event for stops
        updateVehicle = function() { return $scope.getVehicles(); }
    } else {
        showDetail(configCT)
    }


});
//get the trip id from prediction data
function getTripId(data) {
    return data.map(function(el) {
        return el.relationships.trip.data.id
    })
}

//draw routes
function drawRoutes(position, length) {
    console.log(length)
    var location = position == 'right' ? rightLocation : leftLocation;
    //green routes
    if (!line.select('.' + position).node()) {

        line.append('rect')
            .attr('class', 'bind ' + position)
            .attr('x', location)
            .attr('width', bindWidth)
            .attr('y', interval)
            .attr('height', (length - 1) * interval)
        //direction arrows
        var arrows = line.append('g')
        var count = 4 // the count of arrow between stops
        for (i = 0; i < (length - 1) * count; i++) {
            if (i % count) {
                arrows.append('line')
                    .attr('x1', location)
                    .attr('y1', interval + interval / count * i)
                    .attr('x2', location + bindWidth / 2)
                    .attr('y2', interval + interval / count * i + bindWidth / 2)
                    .attr('class', 'triangle')
                    .attr('transform', 'translate(' + (position == 'right' ? bindWidth / 2 : 0) + ',0)')
                arrows.append('line')
                    .attr('x2', location + bindWidth)
                    .attr('y2', interval + interval / count * i)
                    .attr('x1', location + bindWidth / 2)
                    .attr('y1', interval + interval / count * i + bindWidth / 2)
                    .attr('class', 'triangle')
                    .attr('transform', 'translate(' + (position == 'right' ? -bindWidth / 2 : 0) + ',0)')
            }
        }
    }
}
//draw stations on the routes on main diagram
function drawStation(data) {
    data.reverse();
    console.log(data)
    //draw station and route based on dirction
    var length = data.length;
    drawRoutes('right', length)
    drawRoutes('left', length)
    var update = line.selectAll('.stop')
        .data(data)
    update.exit().remove();
    var enter = update.enter()
        .append('g')
        .attr('class', function(d) { return 'stop ' + d.id })
        .attr('transform', function(d, i) { return 'translate(' + 0 + ',' + (i + 1) * interval + ')' })

    enter.append('text')
        .text(function(d) { return d.attributes.name.trunc(15) })
        .attr('class', 'stationName')
        .attr('x', (rightLocation + leftLocation + bindWidth) / 2)

    var circleLGroup = enter.append('g').attr('class', 'stopGroup')
        .attr('data-arrivalid', function(d) { return d.id.replace('place-', '') })
        .attr('data-arrivaldirection', 0)
        .attr('transform', 'translate(' + (leftLocation + bindWidth / 2) + ',' + '0)')
        .on('click', function(d) {
            nowArrivalStationCode = d.id.replace('place-', '');
            nowArrivalStationDirection = 0;
            //highlight the selected stop
            highlightNextArrivals()
            updateVehicle()
        })
    circleLGroup.append('circle')
        .attr('r', function(d, i) { return i == 0 || i == length - 1 ? bindWidth - 6 : (bindWidth - 6) / 2 })
        .attr('class', function(d, i) { return i == 0 || i == length - 1 ? 'terminalStop' : 'middleStop' })


    var circleRGroup = enter.append('g').attr('class', 'stopGroup')
        .attr('data-arrivalid', function(d) { return d.id.replace('place-', '') })
        .attr('data-arrivaldirection', 1)
        .attr('transform', 'translate(' + (rightLocation + bindWidth / 2) + ',' + '0)')
        .on('click', function(d) {
            nowArrivalStationCode = d.id.replace('place-', '');
            nowArrivalStationDirection = 1;
            //highlight the selected stop
            highlightNextArrivals()
            updateVehicle()
        })
    circleRGroup.append('circle')
        .attr('r', function(d, i) { return i == 0 || i == length - 1 ? bindWidth - 6 : (bindWidth - 6) / 2 })
        .attr('class', function(d, i) { return i == 0 || i == length - 1 ? 'terminalStop' : 'middleStop' })

    circleRGroup.append('rect')
        .attr('width', (rightLocation - leftLocation) / 2)
        .attr('height', interval / 2)
        .attr('y', -interval / 2 / 2)
        .attr('x', -(rightLocation - leftLocation) / 2 + bindWidth / 2)
        .style('opacity', 0)
    // .style('fill', 'green')
    circleLGroup.append('rect')
        .attr('width', (rightLocation - leftLocation) / 2)
        .attr('height', interval / 2)
        .attr('y', -interval / 2 / 2)
        .attr('x', -bindWidth / 2)
        .style('opacity', 0)
    // .style('fill', 'red')
    //highlight the selected stop
    highlightNextArrivals()
}

//draw vehicles on main diagram
function drawVehicles(data, arrivalName) {
   
    vehicles.selectAll('.multiple').remove()
    vehicles.selectAll('.vehicle').classed('hidden', false)
    var update = vehicles.selectAll('.vehicle')
        .data(data, function(d) { return d.id })

    var enter = update.enter()
        .append('g')
        .attr('class', function(d) { return 'vehicle train' + d.id })
        .attr('data-location', function(d) {
            var fixedStopId = sharingStop.includes(+d.relationships.stop.data.id) ? sharingStop[0] : d.relationships.stop.data.id;

            var fixedStatus = d.attributes.current_status == 'INCOMING_AT' || d.attributes.current_status == 'IN_TRANSIT_TO' ? 'INCOMING_AT' : d.attributes.current_status
            return fixedStatus + '-' + fixedStopId + '-' + d.attributes.direction_id
        })
        .on('click', function(d) {
            var n = [];
            n[0] = d;
            return showVehicle(n, arrivalName)
        })
        .attr('transform', function(d) {
            var station = getXYFromTranslate(d3.select('.' + d.parent_station)._groups[0][0]);
            var Y = station[1];
            var X = d.attributes.direction_id == 1 ? (rightLocation + 2.3 * bindWidth) : (leftLocation - 1.3 * bindWidth);
            var offsetY = offsetX = 0;
            if (d.attributes.current_status == 'INCOMING_AT' || d.attributes.current_status == 'IN_TRANSIT_TO') {
                //check if the train is turning around at a terminal stop
                var ifToTerminal = terminals.find(function(t) { return t.stop_id == d.relationships.stop.data.id })
                if (ifToTerminal && (ifToTerminal.direction_id != d.attributes.direction_id)) {
                    offsetY = interval * (d.attributes.direction_id == 1 ? -1 : 1) * .4;
                    offsetX = (d.attributes.direction_id == 1 ? -1 : 1) * ((rightLocation - leftLocation) / 2 + 4 * bindWidth);
                } else {
                    offsetY = (d.attributes.direction_id == 1 ? 1 : -1) * interval / 2;
                }
            }
            return 'translate(' + (X + offsetX) + ',' + (Y + offsetY) + ')';
        })

    enter.append('svg:image')
        .attr("xlink:href", function(d) { return "images/" + d.relationships.route.data.id + ".png" })
        .attr('width', vehicleSize)
        .attr('height', vehicleSize)
        .attr('x', -vehicleSize / 2)
        .attr('y', -vehicleSize / 2)
    enter.append('text').text(function(d) { return d.attributes.label })
        .attr('class', 'vehicleNum')
        // .style('fill', function(d) { return trainColor.find(function(e) { return e.branch == d.relationships.route.data.id }).color })
        .style('fill', '#eee')
        .attr('x', function(d) { return (d.attributes.direction_id == 0 ? -1 : 1) * vehicleSize / 2 })
        .style('text-anchor', function(d) { return d.attributes.direction_id == 0 ? 'end' : 'start' })
    enter.insert('rect', 'image')
        .attr('width', function(d) { return d3.select(this.parentNode).node().getBBox().width + vehicleSize / 2 })
        .attr('height', highlightBGHeight)
        .style('fill', 'none')

    var merge = update.merge(enter)
        .attr('data-location', function(d) {
            var fixedStopId = sharingStop.includes(+d.relationships.stop.data.id) ? sharingStop[0] : d.relationships.stop.data.id;
            var fixedStatus = d.attributes.current_status == 'INCOMING_AT' || d.attributes.current_status == 'IN_TRANSIT_TO' ? 'INCOMING_AT' : d.attributes.current_status
            return fixedStatus + '-' + fixedStopId + '-' + d.attributes.direction_id
        })
        .on('click', function(d) {
            var n = [];
            n[0] = d;
            return showVehicle(n, arrivalName)
        })
        .transition()
        .attr('transform', function(d) {

            var station = getXYFromTranslate(d3.select('.' + d.parent_station)._groups[0][0]);
            var Y = station[1];
            var X = d.attributes.direction_id == 1 ? (rightLocation + 2.3 * bindWidth) : (leftLocation - 1.3 * bindWidth);
            var offsetY = offsetX = 0;
            if (d.attributes.current_status == 'INCOMING_AT' || d.attributes.current_status == 'IN_TRANSIT_TO') {
                //check if the train is turning around at a terminal stop
                var ifToTerminal = terminals.find(function(t) { return t.stop_id == d.relationships.stop.data.id })
                if (ifToTerminal && (ifToTerminal.direction_id != d.attributes.direction_id)) {
                    offsetY = interval * (d.attributes.direction_id == 1 ? -1 : 1) * .45;
                    offsetX = (d.attributes.direction_id == 1 ? -1 : 1) * ((rightLocation - leftLocation) / 2 + 3 * bindWidth);
                } else {
                    offsetY = (d.attributes.direction_id == 1 ? 1 : -1) * interval / 2;
                }
            }
            return 'translate(' + (X + offsetX) + ',' + (Y + offsetY) + ')';
        })

    merge.select('text')
        .attr('x', function(d) { return (d.attributes.direction_id == 0 ? -1 : 1) * vehicleSize / 2 })
        .style('text-anchor', function(d) { return d.attributes.direction_id == 0 ? 'end' : 'start' })
    merge.select('rect')
        .attr('transform', function(d) {
            var textSize = d3.select(this.parentNode).select('text').node().getBBox();
            return 'translate(' + ((d.attributes.direction_id == 0 ? (-textSize.width - vehicleSize + 3) : -vehicleSize / 2 - 3)) + ',' + (textSize.y - highlightBGHeight + vehicleSize) + ')'
        })
    update.exit().remove();
}

//when multiple trans, hidden them and draw a grouped train 
function replaceMultiVehicles(data, arrivalName) {
    var allLocation = d3.set();
    data.forEach(function(vehicle) {
        var fixedStopId = sharingStop.includes(+vehicle.relationships.stop.data.id) ? sharingStop[0] : vehicle.relationships.stop.data.id;
        var fixedStatus = vehicle.attributes.current_status == 'INCOMING_AT' || vehicle.attributes.current_status == 'IN_TRANSIT_TO' ? 'INCOMING_AT' : vehicle.attributes.current_status
        var attr = fixedStatus + '-' + fixedStopId + '-' + vehicle.attributes.direction_id
        if (!allLocation.has(attr)) {
            allLocation.add(attr);
        }
    })
    allLocation.values().forEach(function(location) {
        var findMulti = Array.from(document.querySelectorAll('[data-location=' + location + ']'))
        var count = findMulti.length
        if (count > 1) {
            // console.log(location)
            var locationdata = location.split('-')
            var multidata = data.filter(function(d) { var fixedStopId = sharingStop.includes(+d.relationships.stop.data.id) ? sharingStop[0] : d.relationships.stop.data.id; return (d.attributes.current_status == locationdata[0]) && (fixedStopId == locationdata[1]) && (d.attributes.direction_id == locationdata[2]) })
            //hidden the multiple trains
            Array.from(findMulti).forEach(function(multi) {
                multi.classList.add('hidden')
            })
            // //show multiicon
            var updatamulti = vehicles
                .append('g')
                .attr('class', 'multiple')
                .attr('transform', 'translate(' + getXYFromTranslate(findMulti[0])[0] + ',' + getXYFromTranslate(findMulti[0])[1] + ')')
                .on('click', function() { showVehicle(multidata, arrivalName) })
                .attr('data-location', location)
                .selectAll('.multipleimg')
                .data(multidata)
            var entermulti = updatamulti.enter()
                .append('g')
                .attr('transform', function(d, i) { return 'translate(' + ((+locationdata[2] == 0 ? -1 : 1) * i * vehicleSize - vehicleSize / 2) + ',' + -vehicleSize / 2 + ')' })
                .attr('class', function(d) { return 'multipleimg train' + d.id + (d.id == ishighlight ? ' highlight' : '') })

            entermulti.append('svg:image')
                .attr("xlink:href", function(d) { return "images/" + d.relationships.route.data.id + ".png" })
                .attr('width', vehicleSize)
                .attr('height', vehicleSize)
            entermulti.insert('rect', 'image')
                .attr('width', function(d) { return d3.select(this.parentNode).node().getBBox().width })
                .attr('height', highlightBGHeight)
                .style('fill', 'none')
                .attr('y', -3)
                .attr('class', function(d) { return d3.select(this.parentNode).node().className.baseVal.includes('highlight') ? 'highlightBG' : '' })

            updatamulti
                .merge(entermulti)
                .attr('transform', function(d, i) { return 'translate(' + ((+locationdata[2] == 0 ? -1 : 1) * i * vehicleSize - vehicleSize / 2) + ',' + -vehicleSize / 2 + ')' })
                .on('click', function() { showVehicle(multidata, arrivalName) })

        }
    })
}
//show vehicle's information when click on the icon of it
function showVehicle(data, arrivalName) {

    if (data.filter(function(d) { return d.id == ishighlight })) {
        removeHighlight()
    }

    //open the dismiss area when open the search/alerts
    dismiss.classList.remove('hidden');
    isDismiss = true;
    vehicleBox.classList.add('openBox');
    vehicleCT.innerHTML =
        data.map(function(d) {
            return '<p class=\'lead\'><img class="trainIcon" src="images/' + d.relationships.route.data.id + '.png">' + d.attributes.label + (d.arrival_time ? (' will arrive ' + arrivalName + ' at ' + getTime(d.arrival_time)[0] + getTime(d.arrival_time)[1] + getTime(d.arrival_time)[2]) : '') + '.</p>';
        }).join('')
    isVehicle = true;
}

//show the next arrivals' vehicle label and location
function showArrivalVehicles(nextarrivals, allStops) {
    // console.log(nextarrivals)
    if (nextarrivals.length != 0 && allStops.length != 0) {
        document.querySelector('#arrivalTime').innerHTML =
            nextarrivals.map(function(arrival) {
                var time = getTime(arrival.arrival_time);
                return '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p class=\"arrivalTime\">' + time[0] + '<span class=\"ap\">' + time[1] + time[2] + '</span></p></div>';
            }).join('');
        document.querySelector('#arrivalVehicle').innerHTML =
            nextarrivals.map(function(arrival) {
                return '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p><span class=\"vehicleCode\" style=\"color:' + trainColor.find(function(d) { return d.branch == arrival.relationships.route.data.id }).color + '\">' + arrival.attributes.label + '</span></p></div>'
            }).join('') + '<hr class="arrivals">';
        document.querySelector('#arrivalLocation').innerHTML =
            nextarrivals.map(function(arrival) {
                var name = allStops.find(function(d) { return d.id == arrival.parent_station }).name;
                return '<div class=\"col-xs-4 col-sm-4 col-md-4 col-lg-4\"><p><span class=\"text-darker\">' + (arrival.attributes.current_status == 'INCOMING_AT' || arrival.attributes.current_status == 'IN_TRANSIT_TO' ? 'approaching ' : 'at ') + '</span><span>' + name + '</span></p></div>'
            }).join('');
    } else {
        document.querySelector('#arrivalVehicle').innerHTML = '';
        document.querySelector('#arrivalLocation').innerHTML = '<br>';
        document.querySelector('#arrivalTime').innerHTML = 'No prediction time available'
    }
}

//highlight the selected next arrivals
function highlightNextArrivals() {

    var x = leftLocation + bindWidth * (nowArrivalStationDirection == 0 ? -0.5 : 1.5)
    var y = getXYFromTranslate(document.querySelector('.place-' + nowArrivalStationCode))[1] - highlightBGHeight / 2
    plot.select('#highlightMarker').transition().attr('transform','translate(' + x + ',' + y + ')')

    d3.selectAll('.stopGroup').select('circle').classed('select', false)
    document.querySelector('.place-' + nowArrivalStationCode).querySelector('g[data-arrivaldirection="' + nowArrivalStationDirection + '"]').querySelector('circle').classList.add('select')
}
//show alerts
function showAlerts(data) {
    document.querySelector('#alertDetail').innerHTML =
        data.map(function(alert) {
            return '<div id=alert' + alert.id + '><h5 class=\"alertTitle\"><strong>' + alert.attributes.service_effect + ':&nbsp;</strong>' + alert.attributes.short_header + '</h5>' + (alert.attributes.description ? ('<p class=\"alertDes hidden\">' + alert.attributes.description + '</p><p class=\"viewMore\"><a>View More Detail&nbsp;<i class="fa fa-angle-right" aria-hidden="true"></i></a></p>') : ('')) + '<p class=\"text-darker\">Last Updated: ' + getDate(alert.attributes.updated_at) + '</p></div>';
        }).join('')

    //when click the detail of X alert, close other details of alerts.
    var alerts = document.querySelectorAll('.viewMore');
    Array.from(alerts).forEach(function(alert) {
        alert.addEventListener('click', function() {
            var active = this.parentElement.id
            Array.from(document.querySelectorAll('.alertDes')).forEach(function(d) {
                if (d.parentElement.id == active) {
                    d.classList.remove('hidden')
                } else {
                    d.classList.add('hidden')
                }
            })
            Array.from(alerts).forEach(function(d) {
                if (d.parentElement.id == active) {
                    d.classList.add('hidden')
                } else {
                    d.classList.remove('hidden')
                }
            })
        })
    })

}
//draw alerts icon
function drawAlertIcon(count) {
    var svgBox = document.querySelector('.alertImg')
    if (svgBox.childElementCount) {
        d3.select('.alertImg').select('svg').select('text').text(count)
    } else {
        var svg = d3.select('.alertImg').append('svg')
            .attr('viewBox', '0 0 ' + 110 + ' ' + 110)
            .attr('width', svgBox.clientWidth)
            .attr('height', svgBox.clientHeight)
        svg.append('path')
            .attr('d', 'M84.18,41.34l-3.42.46C80.61,26,73.21,14.52,59.34,7.34a37,37,0,0,0-30-2.08C9,12.23-2,35,5.3,55.14,11.76,73,32.57,88.68,58.91,77.48L60,80.57A36.58,36.58,0,0,1,46.57,84.1c-7,.39-13.92.05-20.55-2.7A42.41,42.41,0,0,1,10.07,69.55,39.54,39.54,0,0,1,1.74,54.66,44.81,44.81,0,0,1,.14,38.6a41.54,41.54,0,0,1,4.07-15A40.25,40.25,0,0,1,12,12.5C17.87,6.68,24.71,2.49,32.9.85a46.15,46.15,0,0,1,16-.29c11.91,1.8,21,8.13,27.88,17.81A40.89,40.89,0,0,1,83.87,36.7C84.08,38.23,84.08,39.8,84.18,41.34Z')
            .style('fill', '#fff')
        svg.append('path')
            .attr('d', 'M69.24,34.66H48.86V68.78H34.35V34.7H14.79v-12H69.24Z')
            .style('fill', '#fff')
        svg.append('path')
            .attr('d', 'M85.73,94a24.65,24.65,0,1,1,24.72-24.54A24.74,24.74,0,0,1,85.73,94Z')
            .style('fill', '#FFD852')
        svg.append('text').text(count).attr('transform', 'translate(75,80)')
            .style('font-size', '1.6em')
            .style('stroke', 10)
    }
}

// get the coordinates of stops
function getXYFromTranslate(element) {
    var x, y;
    if (element) {
        var split = element.getAttribute('transform').split(',');
        x = +split[0].split("(")[1];
        y = +split[1].split(")")[0];
    } else {
        x = -100;
        y = -100;
    }

    return [x, y];
}


function getTime(datestring) {
    var time = [];
    if (datestring) {
        var msec = Date.parse(datestring);
        var d = new Date(msec);
    } else {
        d = new Date()
    }
    var timing = (d.getHours() > 12 ? -12 : 0) + d.getHours() + ' : ' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(),
        seconds = ' : ' + (d.getSeconds() < 10 ? '0' : '') + d.getSeconds(),
        ap = d.getHours() >= 12 ? ' PM' : ' AM';
    time.push(timing, seconds, ap)
    return time
}

function getDate(datestring) {
    var d = new Date(Date.parse(datestring));
    var date = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + (d.getHours() > 12 ? d.getHours() - 12 : d.getHours()) + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + (d.getHours() >= 12 ? ' PM' : ' AM');
    return date
}


function distance(lat1, lon1, lat2, lon2) {
    var p = Math.PI / 180;
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}