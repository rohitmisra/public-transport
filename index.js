'use strict';
var exports = module.exports = {};
exports.departures = function(options) {
    return request(TransportClients[options.type].stationsOption(options.station)).then(function(stationObj) {
        return request(TransportClients[options.type].deptOption(stationObj, options.products)).then(function(transportObj) {
            return { station: stationObj, departures: transportObj };
        });
    });
};



var request = require('request-promise');
var xml2jsParser = require('xml2js').parseString;
var iconv = require('iconv-lite');
var HtmlTableToJson = require('html-table-to-json');


function promisesParser(string) {
    return new Promise(function(resolve, reject) {
        xml2jsParser(string, function(err, result) {
            if (err) {
                return reject(err);
            } else {
                return resolve(result);
            }
        });
    });
}

var meansOfTransport = Object.freeze({
    'ice': 0,
    'ic': 1,
    'd': 2,
    'nv': 3,
    's': 4,
    'bus': 5,
    'boat': 6,
    'u': 7,
    'str': 8,
    'ast': 9
});



var stationDECallback = function(body, response, resolveWithFullResponse) {
    var response = iconv.decode(body, 'iso-8859-1');
    response = response.substring(8, response.length - 22);
    return { name: JSON.parse(response).suggestions[0].value, id: JSON.parse(response).suggestions[0].extId }
    //getDepartures();
};
var stationDEOptions = function(station) {
    return {
        url: "http://www.img-bahn.de/bin/ajax-getstop.exe/dn",
        method: 'GET',
        qs: { s: station },
        encoding: null,
        transform: stationDECallback
    };
}

var deptDECallback = function(body, response, resolveWithFullResponse) {
    return promisesParser('<root>' + iconv.decode(body, 'iso-8859-1') + '</root>').then(function(result) {

        var timeTableObjArr = function(entries) {
            this.entries = entries;
            this.prettyPrint = function() {
                entries.forEach(function(val, idx) {
                    console.log(val.$.prod.split('#')[0].split('   ').join(' ') + " : " + val.$.targetLoc + " : " + val.$.fpTime + "(+" + val.$.approxDelay + ")");
                });
            };
        };
        var timetableObj = new timeTableObjArr(result.root.Journey);
        return timetableObj;
    }).catch(function(err) {
        //error here
    });
};
var deptDEOptions = function(input, productsFilter, maxJourneys, date) {
    var products = parseTransportClasses(productsFilter);
    var d = new Date();
    date = date || (d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear().toString().substring(2));
    return {
        url: 'https://mobile.bahn.de/bin/mobil/bhftafel.exe/dn',
        qs: { method: 'GET', input: input, productsFilter: products || '11111111111111', boardType: 'dep', disableEquivs: '1', maxJourneys: '10', time: 'now', date: date, clientType: 'ANDROID', L: 'vs_java3', hcount: '0', start: 'yes' },
        encoding: null,
        transform: deptDECallback
    }
};



var stationINCallback = function(body, response, resolveWithFullResponse) {
    var resp = JSON.parse(body);
    if (resp.length > 0) {
        //console.log("closest match: " + resp[0].name + ',' + resp[0].state_name + ' (' + resp[0].code + ')');
        return { name: resp[0].name, id: resp[0].code, state: resp[0].state_name };
    } else {
        console.log("No match found for station");
    }
}
var stationINOptions = function(q) {
    return {
        url: 'http://search.railyatri.in/station/search',
        method: 'GET',
        qs: {
            q: q
        },
        transform: stationINCallback
    };
}

var deptINCallback = function(body, response, resolveWithFullResponse) {
    //var timetableNew = JSON.parse(body).data.split(';');
    var timeTable = new HtmlTableToJson('<table>' + JSON.parse(body).data + '</table>').results[0];
    var timeTableObj = function(trainname, arrival, departure, delay) {
        this.trainname = trainname;
        this.arrival = arrival;
        this.departure = departure;
        this.delay = delay;
    }
    var timeTableObjArr = function(entries) {
        this.entries = entries;
        this.prettyPrint = function() {
            this.entries.forEach(function(val, idx) {
                console.log(val.trainname + " Arrives: " + val.arrival + " Departs: " + val.departure + " Delayed by: " + val.delay);
            });
        };

    };
    var entries = [];
    timeTable.forEach(function(val, idx) {
        entries.push(new timeTableObj(val[2], val[5], val[6], val[8]));
    });
    var timeTableEntries = new timeTableObjArr(entries);
    return timeTableEntries;
}
var deptINOptions = function(stationObj) {
    return {
        url: "http://etrain.info/ajax.php",
        method: 'POST',
        qs: {
            q: "larrdep",
            v: "2.10.1"
        },
        encoding: null,
        formData: {
            station: stationObj.name,
            stn: stationObj.id,
            stnqt: 'live'
        },
        headers: {
            'Referer': 'http://etrain.info/in?STATION=URL',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
        },
        transform: deptINCallback
    };
}



function TransportClient(stationsOption, deptOption) {
    this.stationsOption = stationsOption;
    this.deptOption = deptOption;
};

var TransportClients = {
    dbahn: new TransportClient(stationDEOptions, deptDEOptions),
    irctc: new TransportClient(stationINOptions, deptINOptions)
};





function parseTransportClasses(transportString) {
    if (transportString === undefined || transportString == "")
        return null;
    var transportMask = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var transportStringArr = transportString.split(/[\s,]+/);
    transportStringArr.forEach(function(val, idx) {
        if (!(val in meansOfTransport)) {
            throw ("Unsupported transport type: " + val + ", supported types: " + Object.keys(meansOfTransport));
        }
        transportMask[meansOfTransport[val]] = 1;
    });
    return transportMask.join('');
}

//var p = exports.departures({ type: 'dbahn', station: 'hausener weg', products: 'u' });
/*var p = exports.departures({ type: 'irctc', station: 'bhubaneswar', products: 'u, bus' });
p.then(function(value) {
    console.log("Closest Match: " + value.station.name);
    value.departures.prettyPrint();
});*/

//getDepartures('dbahn');
//parseTransportClasses("ice, bus, s, str");
//getStations();