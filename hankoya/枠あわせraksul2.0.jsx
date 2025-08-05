/********************************************************
JavaScript for Illustrator

■枠合わせ Ver.1.1

枠に合わせて、テキストを調整します

作成者：米谷                               2020_03_7
---------------------------------
2021.04.25 CCでのエラー回避
・テキストを２つまたは枠を２つ選択時に警告を表示
********************************************************/

// ver2.00 徹底改造

var ASPECT_RATIO_LIMIT = 50; //100 - ASPECT_RATIO_LIMITまで幅を調節する
var FRAME_MARGIN = 1; //枠内に少しだけ余裕を持って入るようにするための数値
var MAX_ADJUSTMENT_ITERATIONS = 99999; //最大試行回数
var MIN_FONT_SIZE_PT = 9; //最小フォントサイズ
var TRACKING_INCREMENT = 10; //一度のトラッキングで広げる値

main();

function main() {
	//テキストのあるレイヤーが枠線レイヤーより上でないと動かない
	//selectionは上のレイヤーほど小さな番号。同じレイヤーでは前面ほど小さな番号になる

	var doc = app.activeDocument;

	if (doc.selection.length != 2) {
		alert("1組のテキストと枠のみを選択したら動くよ。(＾＾)/");
		return;
	}

	if (doc.selection[0].typename != "TextFrame" || doc.selection[1].typename != "PathItem") {
		alert("1組のテキストと枠を、テキストが前面にある状態で選択してください");
		return;
	}

	var originalCoordinateSystem = app.coordinateSystem;
	app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
	Size_Adjust(prepareObjects());
	alignObjects(1);
	app.coordinateSystem = originalCoordinateSystem;
}

//---------------------------------------------------------

function prepareObjects() {
	var doc = app.activeDocument;
	var Text_Item = doc.selection[0];
	var Object_Item = doc.selection[1];

	//バウンディングボックスの取得(X,Y,X2,Y2)
	var bounds = Object_Item.geometricBounds;
	var Object_X2 = Math.round(bounds[2]);//オブジェクトのお尻のX座標
	var Object_Y3 = Math.round(bounds[3]);//オブジェクトのお尻のY座標

	//テキストスタイル初期化
	var txtRange = Text_Item.textRange;
	txtRange.scaling = [1, 1];//長体・平体の解除
	txtRange.tracking = 0; //トラッキングを0

	//枠の位置に合わせてテキストを移動する
	if (Text_Item.orientation == TextOrientation.HORIZONTAL) {//横書き
		alignObjects(0);
	} else {//縦書き
		alignObjects(2);
	}
	return [Object_X2, Object_Y3, Text_Item.orientation];
}

//---------------------------------------------------------

//文字調整
function Size_Adjust(arr) {
	var txtOrientation = arr[2];
	if (txtOrientation == TextOrientation.HORIZONTAL) {
		var objPosition = arr[0];//オブジェクトお尻のx座標
	} else {
		var objPosition = -arr[1];//オブジェクトお尻のY座標
	}

	var doc = app.activeDocument;
	var txtObj = doc.selection[0]; //テキストオブジェクト
	var txtRange = txtObj.textRange;
	var Org_Size = txtRange.size; //元のテキストサイズ
	var charLength = txtObj.characters.length;//テキストの文字数
	var lastChar = txtObj.characters[charLength - 1]; //最後の文字
	var ReSize = false; //フォントサイズを下げたかどうか

	for (var m = 0; m < MAX_ADJUSTMENT_ITERATIONS; m++) {
		var bounds = txtObj.geometricBounds;
		if (txtOrientation == TextOrientation.HORIZONTAL) {
			var txtPosition = Math.round(bounds[2]);//テキストお尻のX座標
		} else {
			var txtPosition = -Math.round(bounds[3]);//テキストお尻のY座標
		}

		if (txtPosition > objPosition) {//テキストが枠より大きい
			if (m <= ASPECT_RATIO_LIMIT) {//長体処理 半分の幅まで許容する
				if (txtOrientation == TextOrientation.HORIZONTAL) {
					txtRange.scaling = [1 - 0.01 * m, 1];
				} else {
					txtRange.scaling = [1, 1 - 0.01 * m];
				}
			} else {//長体50％未満になる場合には、フォントサイズを一つ小さくする。
				if (txtRange.size >= 10) {
					txtRange.size--;
					ReSize = true;
				} else if (txtRange.size == 9) {//長体が50％未満になり、文字もこれ以上小さくできない場合
					alert('テキストが9ptでも長体/平体が50％未満になります。木台サイズの大きい物で提案してください。');
				} else if (txtRange.size == MIN_FONT_SIZE_PT) {//長体が50％未満になり、文字もこれ以上小さくできない場合
					alert('テキストが' + MIN_FONT_SIZE_PT + 'ptでも長体/平体が50％未満になります。木台サイズの大きい物で提案してください。');
					break;
				}
			}
			if (txtPosition < objPosition - FRAME_MARGIN) {
				break;
			}
		} else if (txtPosition > objPosition - FRAME_MARGIN * 1.1) {
			break;
		} else {//テキスト幅が枠より狭い時はトラッキングで広げる
			txtRange.tracking += 10;
			txtRange.tracking += TRACKING_INCREMENT;
			lastChar.tracking = 0;
			if (txtPosition > objPosition - FRAME_MARGIN * 1.1) {
				break;
			}
		}
	}
	if (ReSize) {
		alert('長体/平体が50％未満にならないように、文字サイズを' + Org_Size + 'ptから' + txtRange.size + 'ptに小さくしました。');
	}
	//	txtObj.baselineShift= 0;
}

//オブジェクトの位置をキーオブジェクトに揃える
function alignObjects(n) {

	// Settings
	switch (n) {
		case 0:
			var settings = {//横書き（左右：左合わせ・天地：中央）
				'horizontal': 0,
				'vertical': 1
			};
			break;
		case 1:
			var settings = {//（左右：中央、左右：中央）
				'horizontal': 1,
				'vertical': 1
			};
			break;
		case 2:
			var settings = {//縦書き（左右：中央、天地：上合わせ）
				'horizontal': 1,
				'vertical': 0
			};
	}

	// 'vertical'    -> 水平方向［-1:移動なし｜0:左｜1:中央｜2:右］
	// 'horizontal'  -> 垂直方向［-1:移動なし｜0:上｜1:中段｜2:下］

	// Document and selection
	var doc = app.activeDocument;
	var sel = doc.selection;
	var wlay = sel[0].layer;//テキストのあるレイヤー

	// Get target objects and properties
	var targets = getTargetObjects(sel);
	var targetsProps = [];
	for (var i = 0; i < targets.length; i++) {
		targetsProps.push(getProperties(targets[i]));
	}

	// 最背面のオグジェクトをキーにする
	var baseProp = getProperties(targets[targets.length - 1]);

	// Calculate the gap distance
	for (var key in targetsProps) {
		targetsProps[key].gap = [0, 0];
		switch (settings.horizontal) {
			case 0:
				targetsProps[key].gap[0] = baseProp.bounds[0] - targetsProps[key].bounds[0];
				break;
			case 1:
				targetsProps[key].gap[0] = baseProp.center[0] - targetsProps[key].center[0];
				break;
			case 2:
				targetsProps[key].gap[0] = baseProp.bounds[2] - targetsProps[key].bounds[2];
				break;
			default:
				break;
		}
		switch (settings.vertical) {
			case 0:
				targetsProps[key].gap[1] = baseProp.bounds[1] - targetsProps[key].bounds[1];
				break;
			case 1:
				targetsProps[key].gap[1] = (baseProp.center[1] - targetsProps[key].center[1]) * -1;
				break;
			case 2:
				targetsProps[key].gap[1] = baseProp.bounds[3] - targetsProps[key].bounds[3];
				break;
			default:
				break;
		}

		// Translate the target
		targetsProps[key].item.translate(targetsProps[key].gap[0], targetsProps[key].gap[1]);
	}


	// Get target objects
	function getTargetObjects(objects) {
		var targets = [];
		for (var key in objects) {
			var item = objects[key];
			targets.push(item);
		}
		return targets;
	}

	// Get the bounds from target
	function getTheBounds(item) {
		var bounds = item.geometricBounds;
		if (item.typename === 'TextFrame') {
			bounds = getTextItemBounds(item);
		}
		return bounds;
	}

	// Get the properties from target
	function getProperties(item) {
		var bounds = getTheBounds(item);
		var size = [bounds[2] - bounds[0], Math.abs(bounds[3] - bounds[1])];
		var props = {
			item: item,
			bounds: bounds,
			size: size,
			center: [bounds[2] - size[0] / 2, (bounds[3] + size[1] / 2) * -1]
		};
		return props;
	}

	// Get the bounds from TextFrame
	function getTextItemBounds(item) {
		if (item.orientation == TextOrientation.VERTICAL) return item.geometricBounds;

		var trackings = [];
		var charaAttrs = [];
		var dummyItem = item.duplicate();

		for (var j = 0; j < dummyItem.lines.length; j++) {
			charaAttrs[j] = dummyItem.lines[j].characters[dummyItem.lines[j].characters.length - 1].characterAttributes;
			trackings[j] = charaAttrs[j].tracking;
			var dummyColor = new NoColor();
			if (charaAttrs[j].fillColor.typename == 'NoColor') dummyColor = new RGBColor();
			charaAttrs[j].fillColor = dummyColor;
			charaAttrs[j].tracking = 0;
		}

		var charaAttr = getMaxCharacter(dummyItem.lines[dummyItem.lines.length - 1].characters);
		var heightGap = getTextHeight(charaAttr) - Math.max.apply(null, charaAttr.totalSize);
		var bounds = [dummyItem.geometricBounds[0], dummyItem.geometricBounds[1], dummyItem.geometricBounds[2], dummyItem.geometricBounds[3] + heightGap];
		dummyItem.remove();
		return bounds;
	}

	// Get the height form character
	function getTextHeight(charaAttr) {
		var activeLayer = doc.activeLayer;
		var tf = wlay.textFrames.add();
		tf.name = "_temp_textframe_";
		tf.contents = "D";
		tf.textRange.characterAttributes.size = Math.max.apply(null, charaAttr.totalSize);
		tf.textRange.characterAttributes.textFont = charaAttr.textFont[0];
		var tempHeight = (-tf.geometricBounds[3] + tf.geometricBounds[1]);
		tf.remove();
		doc.activeLayer = activeLayer;
		return tempHeight;
	}

	// Get max size form character
	function getMaxCharacter(charLength) {
		var ca = { 'size': [], 'baselineShift': [], 'textFont': [], 'horizontalScale': [], 'verticalScale': [], 'totalSize': [] };
		for (var i = 0; i < charLength.length; i++) {
			ca.size.push(charLength[i].characterAttributes.size);
			ca.baselineShift.push(charLength[i].characterAttributes.baselineShift);
			ca.textFont.push(charLength[i].characterAttributes.textFont);
			ca.horizontalScale.push(charLength[i].characterAttributes.horizontalScale);
			ca.verticalScale.push(charLength[i].characterAttributes.verticalScale);
			ca.totalSize.push(charLength[i].characterAttributes.size * charLength[i].characterAttributes.verticalScale / 100);
		}
		return ca;
	}
}
