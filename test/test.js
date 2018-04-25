var rewire = require('rewire');
var assert = require('assert');

var publictransport = rewire('../index');

//var p = publictransport.departures({ type: 'dbahn', station: 'hausener weg', products: 'u' });

//var stationDECallback = publictransport.__get__('stationDECallback');


function verifyNumberOfResults(resp) {
    assert(resp.departures.entries.length > 0, 'There should be some entries present');
}

describe('Public Transport', function() {
    describe('Indian Railways', () => {
        it('Should work for for "bhubaneswar"', (done) => {
            var p = publictransport.departures({ type: "irctc", station: "bhubaneswar", products: "" });
            p.then((value) => {
                //console.log("Closest Match: " + value.station.name);
                //value.departures.prettyPrint();
                verifyNumberOfResults(value);
            }).then(done, done);
        });
    });

    describe('Deutsche Bahn callback test', () => {
        it('Should work for "sch tau nord" + "s"', (done) => {
            var p = publictransport.departures({ type: "dbahn", station: "sch tau nord", products: "s" });
            p.then((value) => {
                //console.log("Closest Match: " + value.station.name);
                //value.departures.prettyPrint();
                verifyNumberOfResults(value);
            }).then(done, done);
        });
    });
});