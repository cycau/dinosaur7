/*******************************
 * [Dinosaur7 SPA]
 * 
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
 *******************************/
let _D7_PAGE_BASE = null;
let _D7_DEFAULT_LAYOUT = null;
class D7App {
	constructor() {
		this._CACHE_PAGE = {};
		this._CACHE_LAYOUT = {};
		this._GLOBAL = {};
	}

	init = function(opt) {
		this._opt = opt;
		_D7_PAGE_BASE = opt.pageBase || '';
		_D7_DEFAULT_LAYOUT = opt.defaultLayout || '/';

		const pageInfo = D7Util.parseUrl(opt.topPage || window.location.href);
		this._init_page = pageInfo.query.d7Page || pageInfo.query.d7page || pageInfo.path;

		const preload = opt.preload || [];
		for (const pageUrl of preload) {
			const pageInfo = D7Util.parseUrl(pageUrl);
			this.loadPage(pageInfo.path); // 並列
		}
	}

	start = function() {
		this._APP_ELEM = document.querySelector('body[d7App]');
		if (!this._APP_ELEM) console.error('no [d7App] defined in root html.');

		this.route(this._init_page);
	}

	route = async function(pageUrl) {
		const pageInfo = D7Util.parseUrl(pageUrl);

		let d7Page = this._CACHE_PAGE[pageInfo.path];
		if (!d7Page) {
			d7Page = await D7Page.load(pageInfo.path)
			this._CACHE_PAGE[pageInfo.path] = d7Page;
		}

		await d7Page.render(pageInfo.query);
	}

	storeData = function(key, val) {
		if (val === 'undefined') {
			return this._GLOBAL[key];
		}
		this._GLOBAL[key] = val;
	}
}

/*******************************
 * CONCEPT
 *******************************/
class D7Page {
	constructor(path) {
		this._PATH = path;
		this._PROP = null;
		this._SELF_COMP = null;
	}

	static load = async (path) => {
		console.log('loading page...' + path);

		const d7Page = new D7Page(path);
		d7Page._SELF_COMP = await D7Component.load(path);

		return d7Page;
	}

	render = async function(property) {
		console.log('redering page...');
		const layoutInfo = this._SELF_COMP.getLayoutInfo(property);

		let d7Layout = d7App._CACHE_LAYOUT[layoutInfo.path];
		if (!d7Layout) {
			d7Layout = await D7Layout.load(layoutInfo.path, d7App._APP_ELEM);
			d7App._CACHE_LAYOUT[layoutInfo.path] = d7Layout;
		}

		d7Layout.render(layoutInfo.query);
		const mountPoint = d7Layout.getPageLocation();
		const currPath = mountPoint.getAttribute('d7CurrLayout');
		if (currPath === this._PATH && D7Util.equals(property, this._PROP)) return;

		const virtualDom = this._SELF_COMP.virtualRender(property);
		mountPoint.append(virtualDom);
	}

}

class D7Layout {
	constructor(path, mountPoint) {
		this._PATH = path;
		this._PROP = null;
		this._SELF_COMP = null;
		this._MOUNT_POINT = mountPoint;
		this._MOUNT_PAGE = null;
	}

	static load = async (path, mountPoint) => {
		console.log('loading layout...' + path);
		const d7Layout = new D7Layout(path, mountPoint);
		if (path === '/') {
			d7Layout._MOUNT_PAGE = mountPoint;
			return d7Layout;
		}

		d7Layout._SELF_COMP = await D7Component.load(path);
		return d7Layout;
	}

	render = function(property) {
		console.log('redering layout...');
		if (this._PATH === '/')  return;

		const currPath = this._MOUNT_ELEMENT.getAttribute('d7CurrLayout');
		if (currPath === this._PATH && D7Util.equals(property, this._PROP)) return;

		const virtualDom = this._SELF_COMP.renderComp(property);
		this._MOUNT_POINT.append(virtualDom);
		this._MOUNT_POINT.setAttribute('d7CurrLayout', this._PATH);
		this._MOUNT_PAGE = virtualDom.querySelector('d7Page');
	}

	getPageLocation = function() {
		return this._MOUNT_PAGE;
	}
}

/*******************************
 * COMPONENT
 *******************************/
class D7Component {

	constructor(path) {
		this._PATH = path;
		this._PROP = null;
		this._DOM = null;

		this._CHILDREN = {};
		this._RENDERER = null;
		this._EVENTS = null;
	}

	static load = async function(path) {
		const d7Comp = new D7Component(path);
		d7Comp._RENDERER = await D7Renderer.create(_D7_PAGE_BASE + path);
		return d7Comp;
	}

	virtualRender = function(property) {
		if (D7Util.equals(property, this._PROP)) return this._DOM;

		const virtualDom = this._RENDERER.render(property);
		var elements = virtualDom.querySelectorAll('d7Comp');
		for (const childRoot of elements) {
			const elemUrl = D7Util.parseUrl(childRoot.getAttribute('d7Comp'));
			
			let childComp = this._CHILDREN[elemUrl.path]
			if (!childComp) {
				childComp = D7Component.load(elemUrl.path);
				this._COMPONENTS[elemUrl.path] = childComp;
				continue;
			}

			childRoot.append(childComp.render(elemUrl.query));
		}

		this._PROP = property
		this._DOM = virtualDom;
		return virtualDom;
	}

	getLayoutInfo = function(property) {
		const layoutElem = this._RENDERER.renderLayoutElem(property);
		if (!layoutElem) return {path:_D7_DEFAULT_LAYOUT, query:{}};

		return D7Util.parseUrl(layoutElem.getAttribute('d7Layout'));
	}

	render = function(modelData, selector) {
	}

	collect = function(selector) {
		return {};
	}

	bindEvent = function(selector, eventName, eventFunc) {
	}

	show = function(visible) {
		this._DOM.show(visible);
	}

}

/*******************************
 * RENDERER
 *******************************/
const _D7_CONTAINER_TYPE = {
	"CAPTION": "table", 
	"THEAD": "table",
	"TFOOT": "table",
	"TBODY": "table",
	"TR": "table",
	"COLGROUP": "table tr",
	"COL: ": "table tr",
	"TH": "table tr",
	"TD": "table tr",
	"LI": "ul",
	"DT": "dl",
	"DD": "dl",
	"OPTION": "select",
	"OPTGROUP": "select",
	"AREA": "map",
	"LEGEND": "fieldset",
};

const _D7_CACHE_HTML = {};
class D7Renderer {
	constructor(path) {
		this._META = null;
		this._VIRTUAL_DOM = null;
	}

	static create = async function(path) {
		let htmlText = _D7_CACHE_HTML[path];
		if (!htmlText) {
			htmlText = await D7Api.loadHtml(_D7_PAGE_BASE + path);
		}

		const d7Renderer = new D7Renderer();
		d7Renderer._META = D7Renderer.compile(htmlText);
		d7Renderer._VIRTUAL_DOM = D7Renderer.makeContainer(d7Renderer._META.virtualTag);

		return d7Renderer;
	}

	render = function(model) {
		this._VIRTUAL_DOM.innerHTML = this._META.fnRender(model);
		return this._VIRTUAL_DOM;
	}

	renderLayoutElem = function(model) {
		return null;
	}

	static compile(htmlText) {
		return {
			fnRender: function(_m) {return '<div>ok</div>'},
			fnRenderLayoutInfo: function(_m) {return "<div d7Layout=''>layoutA</div>"},
			virtualTag: 'div',
		};
	}

	static analyze(htmlText) {
		return {
			css: '',
			html: '',
			script: '',
			layoutElement: '',
		};
	}

	static makeContainer = function(tagName) {
		var divTmp = document.createElement("div");
		var strContainer = _D7_CONTAINER_TYPE[tagName.toUpperCase()];
		if (!strContainer) return divTmp;

		var tags = strContainer.split(" ");
		for (var idx in tags) {
			var tempTag = document.createElement(tags[idx]);
			divTmp.append(tempTag);
			divTmp = tempTag;
		}
		return divTmp;
	}
}
/*******************************
 * UTIL
 *******************************/
class D7Util {
	static debug = function(data) {
		console.log(data);
	}
	static equals = function(srcData, tarData) {
		return false;
	}
	static parseUrl = function(strUrl) {
		var query = {};
		strUrl = strUrl.startsWith("http") ? strUrl : ("http://tmp.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			query[key] = value;
		});
		return {path: url.pathname, query: query, origin: url.origin};
	}
}
class D7Api {
	static loadHtml = (htmlUrl) => {
		return new Promise((resolve, reject) => {
			let request = new XMLHttpRequest();
			request.open('GET', htmlUrl);
	
			request.onload = function() {
				if (request.status == 200) {
					resolve(request.responseText);
				} else {
					reject(`http: ${htmlUrl} status[${request.status}]`);
				}
			}
			request.onerror = function() {
				reject(`http: ${htmlUrl} status[${request.status}]`);
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

/*******************************
 * RUNTIME
 *******************************/
const fn = D7App.prototype;
fn.util = D7Util;
fn.api = D7Api;
const d7App = new D7App();
(function (global) {
	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', function () {
				d7App.start();
			});
			/*/ after image css loaded.
			window.addEventListener("load", function () {
				d7App.start();
			});
			*/
			break;
		default : // [interactive, complete]
			d7App.start();
			break;
	}
})(this);

