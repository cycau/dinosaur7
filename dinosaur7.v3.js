/**
 * /page/path1/pageA.html?param1=p1
 * /layout/layoutA.html
 * /component/compA.html
 * 
 * /path1/pageA.html?param1=p1
 * -> /index.html
 * 		-> pageA	<d7layout src="/layout/layoutA"></d7layout>
 * 			-> layoutA
 * 				-> compA
 * 				-> compB
 * 				-> compC
 */
class Dinosaur7 {
	constructor() {
		this._CACHE_PAGE = {};
		this._CACHE_LAYOUT = {};
	}
	route = function(url) {
		let page = this.getPage(url);
		if (page) {
			page.show(url);
			return;
		}
		showPage(url);
	}
	showPage = function(url) {
		const urlInfo = D7Util.parseUrl(url);
		let d7Page = this._CACHE_PAGE[urlInfo.url];
		if (d7Page) {
			d7Page.show();
			return;
		}

		const d7App = this;
		D7Page.load(urlInfo.url)
		.then((d7Page) => {
			d7App._CACHE_PAGE[d7Page.url] = d7Page;
			d7App.currPage = d7Page;

			let d7Layout = d7App._CACHE_LAYOUT[d7Page.layoutUrl];
			if (d7Layout) {
				d7Page.setLayout(d7Layout);
				return d7Layout;
			}

			return d7Page.loadLayout();
		}).then((d7Layout) => {
			d7App._CACHE_LAYOUT[d7Layout.url] = d7Layout;

			d7App.currPage.show();
		})
	}
	addPage = function(url, d7Page) {
		this._CACHE_PAGE[url] = d7Page;
	}
	addLayout = function(url, d7Layout) {
		this._CACHE_LAYOUT[url] = d7Layout;
	}
}
class D7Page {
	constructor() {
	}

	static load = async (url) => {
		console.log('loading page...' + url);
		let htmlText = await D7Api.loadComp(url);
		const d7Page = D7Page.compile(htmlText);
		d7Page.url = url;
		return d7Page;
	}

	static compile = (htmlText) => {
		console.log('compiling page...');
		const d7Page = new D7Page(htmlText);
		return d7Page;
	}

	setLayout = (d7Layout) => {
		this.layout = d7Layout;
		return this;
	}

	loadLayout = async () => {
		const d7Layout = await D7Layout.load();
		this.layout = d7Layout;
		return d7Layout;
	}

	show = function() {
		console.log('showing page...');
		return this;
	}
}

class D7Layout {

	constructor() {
		this.layout = 'layout';
	}

	static load = async (url) => {
		console.log('loading layout...' + url);

		const d7Layout = D7Layout.compile('');
		await d7Layout.loadComponents();
		return d7Layout;
	}

	static compile = function(htmlText) {
		console.log('compiling layout...');
		const d7Layout = new D7Layout();
		return d7Layout;
	}

	loadComponents = async () => {
		console.log('loading components...');
		this.compileComponents();
		return this;
	}

	compileComponents = function() {
		console.log('compiling components...');
	}

	show = function() {
		this.layout.show();
		console.log('showing page...');
	}
}
class D7Compiler {
}
class D7Util {
	static debug = function(data) {
		console.log(data);
	}
	static parseUrl = function(strUrl) {
		var params = {};
		strUrl = strUrl.startsWith("http:") ? strUrl : ("http://tmp.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			params[key] = value;
		});
		return {url:'', path:'', query:params};
	}
}
class D7Api {
	static loadComp = (compUrl) => {
		return new Promise((resolve, reject) => {
			let request = new XMLHttpRequest();
			request.open('GET', compUrl);
	
			request.onload = function() {
				if (request.status == 200) {
					resolve(request.responseText);
				} else {
					reject(`http: ${compUrl} status[${request.status}]`);
				}
			}
			request.onerror = function() {
				reject(`http: ${compUrl} status[${request.status}]`);
			}
			request.send();
		});
	}
	static get = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static post = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static put = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static delete = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
}

const fn = Dinosaur7.prototype;
fn.util = D7Util;
fn.api = D7Api;

const d7 = new Dinosaur7();
(function (global) {
	d7.showPage(window.location.href);
})(this);
