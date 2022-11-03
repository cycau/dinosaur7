# dinosaur7
作成中・・・
汚いですが、testフォルダをご覧になったほうがはやいかも

@keyword React Vue Angular simple pure html client
this framework help you to implement SPA with basic skill no longer need to hard work.
The name [Dinosaur7] comes from that My daughter loves dinosaurs and is 7 years old.

Dinosaur7's all symbols you can specify in html tag
  [_d7] 		specify [if | for | DUMMY] to control rendering html block.
  [_d7v] 	specify key to show Model data to html's tag.
  [_d7m] 	specify key to collect html value to a Map as ModelData.
  [compsrc] 	specify external component resource that includes html and script.
  [compseq] 	priority for loading component, specify this will load in synchronize mode.
  [mainblock] To specify main page content. in SAP mode only mainblock will show as page.
  [solidblock] To tell Dinosaur7 that block don't need to load from remote.

  {%  javascript logic %}
  {%= print value to html %}
  {%=<print value with encode %}

Dinosaur7's all javascript method
  fn.onload(funcOnload) 					run funcOnload on load event.
  fn.s(selector, empty|tarNo)			select one element.
  fn.S(selector) 						select all element.
  fn.m(empty|selector) 					collect target block's data as Map.
  fn.render(ModelData, empty|selector)	render data to target block.
  fn.renderTo(ModelData, srcSelector, empty|srcChildSlector, tarSelector, empty|tarChildSlector)
  fn.remove(selector, empty|childIndex)	remove one element.

  fn.show(empty|false)
  fn.loadpage(url, empty|params)			load a component as page to mainblock.
  fn.api(url, params, empty|options, empty|onSuccess, empty|onError)

  fn.popup(selector, params, autoClose)	popup current html block.
  fn.loadmodal(url, params, autoClose)	load a component and show in modal mode.
  fn.processing(empty|false)				show loading icon.

Dinosaur7's util method
  fn.util.encodeHtml(strHtml)
  fn.util.stringifyUrl(url, params)
  fn.util.stringifyJSON(data)
  fn.util.parseJSON(strJSON)
  fn.util.format(value, fmt, fmtEx)			,|comma|date|datetime|time
  fn.util.emitEvent(selector, eventName, val)
  fn.util.persistVal(key, empty|value)		save to localStorage or cookie.

Expand native Element's method
  Element.s(selector, empty|tarNo)
  Element.S(selector)
  Element.val(strAttr, val)					setter/getter
  Element.css(propOrMap|empty, val|null)		setter/getter, null value to remove
  Element.clazz(classOrList|empty, val|null)	setter/getter, null value to remove
  Element.attr(strProp|empty, val|null)		setter/getter, null value to remove
