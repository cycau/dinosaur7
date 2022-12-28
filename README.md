# Dinosaur7

@keyword React Vue Angular simple pure html client  
You will be freed from complicated configurations and concepts of current front-end technology.  
Look at the sample folder first. It works in both SPA mode and legacy mode.  

既存フロントエンド技術の煩雑な構成＆コンセプトから解放されるでしょう。  
まずはsampleフォルダを眺めてください。  
SPAモードでもレガシーモードでも動かせます。  

The name [Dinosaur7] comes from that My daughter loves dinosaurs and is 7 years old.


## 概要
### Dinosaur7's all symbols you can specify in html tag
```
[_d7] 			specify [if | for | DUMMY] to control rendering html block.
[_d7v] 			specify key to show Model data to html's tag.
[_d7m] 			specify key to collect html value to a Map.
[compsrc] 		specify external component resource that includes html and script.
[compseq] 		priority for loading component, specify this will load in synchronize mode.
[mainblock]		To specify main page area. in SAP mode only mainblock will show as page.
[solidblock]		To tell Dinosaur7 that block don't need to load from remote.
<!-- {%  javascript logic %} -->
<!-- {%= print value to html %} -->
<!-- {%# print value with encode %} -->
```
### Dinosaur7's all javascript method
```
fn.onload(funcOnload) 				run funcOnload on load event.
fn.s(selector, empty|tarNo)			select one element.
fn.S(selector) 					select all element.
fn.m(empty|selector) 				collect target block's data to a Map.
fn.render(ModelData, empty|selector)		render data to target block.
fn.renderTo(ModelData, srcSelector, empty|srcChildSlector, tarSelector, empty|tarChildSlector)
fn.remove(selector, empty|childIndex)		remove one element.
fn.show(empty|false)
fn.loadpage(url, empty|params)			load a component as page to <mainblock> tag.
fn.api(url, params, empty|options, empty|onSuccess, empty|onError)
fn.popup(selector, params, autoClose)		popup current html block.
fn.loadmodal(url, params, autoClose)		load a component and show in modal mode.
fn.processing(empty|false)			show loading icon.
```
### Dinosaur7's util method
```
fn.util.encodeHtml(strHtml)
fn.util.stringifyUrl(url, params)
fn.util.stringifyJSON(data)
fn.util.parseJSON(strJSON)
fn.util.emitEvent(selector, eventName, val)
fn.util.persistVal(key, empty|value)		save to localStorage or cookie.
fn.util.format(value, fmt, fmtEx)		comma|date|datetime|time|...Add on yourself as needed
```
### Expand native Element's method
```
Element.s(selector, empty|tarNo)
Element.S(selector)
Element.getVal(attr)		=> priority[attr > value > innerHTML]
Element.setVal(val, attr)	=> priority[attr > value > innerHTML]
Element.getStyle(prop)
Element.setStyle(propOrMap, nullToDelete)
Element.getClass(clazz)
Element.setClass(clazzOrList, nullToDelete)
Element.getAttr(prop)
Element.setAttr(prop, nullToDelete)
```


## 描画編
### 1.[_d7属性]による制御

##### 1.1 条件による表示非表示
```
<div _d7="if(式)">content</div>
```

##### 1.2 循環表示
```
<div _d7="for(式)">
  <span _d7="if(式) continue|break;">content</span>
</div>
```

##### 1.3 無視（表示対象外）
```
<div _d7="DUMMY ">content</div>
```

##### 1.9 hint
以下の書き方も可能である。
```
<div _d7="if(式)   処理1; 処理2 ...">content</div>
<div _d7="if(式)  {処理1; 処理2 ...">content</div>
<div _d7="for(式)  処理1; 処理2 ...">content</div>
<div _d7="for(式) {処理1; 処理2 ...">content</div>
```

### 2.javascriptによる制御

##### 2.1 条件による表示非表示
```
{% if(式) { %}
HTML
{% } %}
```

##### 2.2 循環表示
```
{% for(式) { %}
HTML
{% } %}
```

##### 2.3 プリント
```
{% =値 %} 値そのまま出力
{% =<値 %} 値をHTMLエンコードし出力
```

##### 2.9 hint
```
{% %}内はJavascriptとして解釈されるが、HTML TAG間に記述する場合<!-- {% %} -->のように囲む必要（安全）がある。
```

## モデル編

### 1.[_d7v属性]表示用
_d7.render({key1:'1980'})を実行すると以下の通り表示される。[_m]は入力データを示す予約語である。  
※表示優先順位[attribute > value > innerHTML]
```
<span _d7v="_m.key1,attributeA01">value1</span>       => <span _d7v="_m.key1" attributeA01="1980"></span>
<span _d7v="_m.key1" value="initValue"></span>        => <span _d7v="_m.key1" value="1980"></span>
<span _d7v="_m.key1">initValue</span>                 => <span _d7v="_m.key1">1980</span>
<span _d7v="_m.key1,attributeA01|comman">value1</span>=> <span _d7v="_m.key1" attributeA01="1,980"></span>
```

### 2.[_d7m属性]取得用。
※取得優先順位[attribute > value > innerHTML]
```
<span _d7m="key1,attributeA01" attributeA01="value1"></span>
<span _d7m="key1" value="value1"></span>
<span _d7m="key1">value1</span>
```
上記三つとも同じ結果となる。_d7.m() => {key1:'value1'}


##### 2.1 配列の場合
```
<span _d7m="key1[]">value1</span>
<span _d7m="key1[]">value2</span>
```
_d7.m() => {key1:['value1','value2']}

##### 2.2 複合配列の場合
```
<table>
  <tr>
    <td _d7m="key1[+].key2">value1</td>
    <td _d7m="key1[].key3">value1</td>
  <tr>
  <tr>
    <td _d7m="key1[+].key2">valueA</td>
    <td _d7m="key1[].key3">valueB</td>
  <tr>
<table>
```
_d7.m() => {key1:[{key2:'value1',key3:'value2'},{key2:'valueA',key3:'valueB'}]}  
※[+]で新しい配列であることを示す。  
以下も同じ効果、[+]の代わりに番号でN番目の配列は新しい配列のスタートということを示す。  
```
<td _d7m="key1[].key2,0">value1</td>  
```
正しくは以下の通り、attribute位置を空けて置いた方がベスト。  
```
<td _d7m="key1[].key2,,0">value1</td>  
```


### 3.双方向定義
[_m]の代わりに[=m]を使うことで、入出力同時定義が可能である。
```
<span _d7v="=m.key1"></span>                        = <span _d7v="_m.key1" _d7m="key1"></span>
<span _d7v="=m.key1,attributeA01"></span>           = <span _d7v="_m.key1,attributeA01" _d7m="key1,attributeA01"></span>
<span _d7v="=m.key1[idx].key2,attribute,0"></span>  = <span _d7v="_m.key1[idx].key2,attribute" _d7m="key1[+].key2,attribute"></span>
<span _d7v="=m.key1[idx].key2,attribute"></span>    = <span _d7v="_m.key1[idx].key2,attribute" _d7m="key1[].key2,attribute"></span>
<span _d7v="=m.key1[idx].key2,,0"></span>           = <span _d7v="_m.key1[idx].key2" _d7m="key1[+].key2"></span>
<span _d7v="=m.key1[idx].key2"></span>              = <span _d7v="_m.key1[idx].key2" _d7m="key1[].key2"></span>
```

### 9.hint
配列の配列はサポートしないが、配列からMap、さらにMapから配列なら大丈夫である。
```
OK: key1[].key2[].key3[], key1[].key2[].key3[].key4
NG: key1[][], key1[].key2[][], key1[].key2[][].key3
```
追加用[+]以外に固定用[n]と挿入用[<n]もある。[<1]で常に2番目のデータとなる。  


## 通信編
```
_d7.api(url, params, options|empty, onSuccess|empty, onError|empty)
options = {
  header: {any}
  method: default"GET"
  responseType: default"JSON"
}
```


## ポップアップウィンドウ編
d7.popup(selector, params, autoClose) カレントHTML内の一部をPOPUP効果で表示。
``` 
in HTML DOCUMENT:
<div id="msgbox" style="display: none;">
  <div class="title">title</div>
  <div class="contents" _d7v="_m.msg"></div>
  <div class="button">
    <button onclick="_d7.clickOk();">ok</button>
    <button onclick="_d7.clickCancel();">cancel</button>
  </div>
</div>


you can run:
var msgbox = this.popup('#msgbox', {msg:'all right?'});
msgbox.clickOk = function() {
  alert("ok clicked!");
}
msgbox.clickCancel = function() {
  msgbox.close();
}
```


## モダルウィンドウ編
_d7.loadmodal(url, params, autoClose) リモートコンポネントをModal効果で表示。
```
var modal = _d7.loadmodal('/com/modalA01.html', {key:'this id modal parameter'}, true);
```
modal.someMethod = function() {}を定義し、  
モダルのイベントから呼び出させることによってモダルから親への値渡し等が可能である。  


## その他
Util系、その他詳細は概要のまんま～  
とりあえずsampleを動かして見ると１時間でマスター？いや15分かな？  
見栄えはbootstrapなど得意なのもと自由に組み合わせて、制限なくさっさと作っちゃいましょ。  
簡単過ぎて仕事が減ったら私のせいにしないでくださいね^^  
