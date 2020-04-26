const axios = require('axios');
const moment = require('moment');

const getLocations = () => axios.get("https://www.loblaws.ca/api/pickup-locations?bannerIds=rass,dominion,fortinos,independent,loblaw,provigo,superstore,valumart,zehrs,maxi,nofrills,independentcitymarket,wholesaleclub&isShoppable=true");

const filterStores = stores => stores.filter(
	({id, address: {region, town}, departments}) =>
		region == 'Ontario' && (town == 'Kitchener' || town == 'Waterloo')
		&& departments.some(({name}) => name=='Click & Collect')
		&& id.indexOf('CT') == -1);

const getTimeSlots = id => axios.get(
	`https://www.zehrs.ca/api/pickup-locations/${id}/time-slots`,
	{
		headers: {
			'Connection': 'keep-alive',
			'Pragma': 'no-cache',
			'Cache-Control': 'no-cache',
			'Accept': 'application/json, text/plain, */*',
			'Site-Banner': 'zehrs',
			'ADRUM': 'isAjax:true',
			'Accept-Language': 'en',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36',
			'Content-Type': 'application/json;charset=utf-8',
			'Sec-Fetch-Site': 'same-origin',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Dest': 'empty',
			'Referer': 'https://www.zehrs.ca/'
		}
	});

const getFirstAvailableOrUndefined = timeSlots => timeSlots.filter(({available}) => available)[0];

const filterUnavailable = results => results.filter(({firstAvailable}) => firstAvailable);

const sortByFirstAvailable = results => results.sort(({firstAvailable: {startTime: a}}, {firstAvailable: {startTime: b}}) => new Date(a) - new Date(b));

const log = results => {
	console.dir(results);
	return results;
};

const formatOutput = results => results
      .map(({name, address: {formattedAddress}, firstAvailable: {startTime, endTime}}) => `
${name}
${formattedAddress}
${moment(startTime).format('dddd MMM Do h:mm a')} - ${moment(endTime).format('h:mm a')}
`)
      .join('');

getLocations()
	.then(({data: stores}) => filterStores(stores))
	.then(stores => Promise.all(
		stores.map(
			({id, name, address}) => getTimeSlots(id)
				.then(({data: {timeSlots}}) => timeSlots)
				.then(getFirstAvailableOrUndefined)
				.then(firstAvailable => ({id, name, address, firstAvailable})))))
	.then(filterUnavailable)
	.then(sortByFirstAvailable)
	.then(formatOutput)
	.then(console.log);
