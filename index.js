'use strict';
var exports = module.exports = {};
exports.departures = function(options) {
    return request(TransportClients[options.type].stationsOption(options.station)).then(function(id) {
        console.log(id);
        request(TransportClients[options.type].deptOption(id, parseTransportClasses(options.products))).then(function(transportObj) {
            return console.log("Departures found!");
            //console.log(transportObj);
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
    console.log("Closest Match: " + JSON.parse(response).suggestions[0].value);
    return JSON.parse(response).suggestions[0].extId
        //getDepartures();
};
var stationDEOptions = function(input) {
    return {
        url: "http://www.img-bahn.de/bin/ajax-getstop.exe/dn",
        method: 'GET',
        qs: { s: input },
        encoding: null,
        transform: stationDECallback
    };
}

var deptDECallback = function(body, response, resolveWithFullResponse) {
    return promisesParser('<root>' + iconv.decode(body, 'iso-8859-1') + '</root>').then(function(result) {
        result.root.Journey.forEach(function(val, idx) {
            console.log(val.$.prod.split('#')[0].split('   ').join(' ') + " : " + val.$.targetLoc + " : " + val.$.fpTime + "(+" + val.$.approxDelay + ")");
        });
        return result.root.Journey;
    }).catch(function(err) {
        //error here
    });
};
var deptDEOptions = function(input, productsFilter, maxJourneys, date) {
    var d = new Date();
    date = date || (d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear().toString().substring(2));
    return {
        url: 'https://mobile.bahn.de/bin/mobil/bhftafel.exe/dn',
        qs: { method: 'GET', input: input, productsFilter: productsFilter || '11111111111111', boardType: 'dep', disableEquivs: '1', maxJourneys: '10', time: 'now', date: date, clientType: 'ANDROID', L: 'vs_java3', hcount: '0', start: 'yes' },
        encoding: null,
        transform: deptDECallback
    }
};



var stationINCallback = function(body, response, resolveWithFullResponse) {
    resp = JSON.parse(body);
    if (resp.length > 0) {
        console.log("closest match: " + resp[0].name + ',' + resp[0].state_name + ' (' + resp[0].code + ')');
        return resp[0];
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
    var timeTable = new HtmlTableToJson('<table>' + JSON.parse(body).data + '</table>').results[0];
    timeTable.forEach(function(val, idx) {
        console.log(val[2] + " Arrives: " + val[5] + " Departs: " + val[6] + " Delayed by: " + val[8]);
    });
    return timeTable;
}
var deptINOptions = function(stationObj) {
    return {
        url: "http://etrain.info/ajax.php",
        method: 'POST',
        qs: {
            q: "larrdep",
            v: "2.9.4"
        },
        encoding: null,
        formData: {
            station: stationObj.name,
            stn: stationObj.code
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

//getDepartures({ type: 'dbahn', station: 'hausener weg', products: 'u' });
//getDepartures({ type: 'irctc', station: 'ndls', products: 'u, bus' });
//getDepartures('dbahn');
//parseTransportClasses("ice, bus, s, str");
//getStations();