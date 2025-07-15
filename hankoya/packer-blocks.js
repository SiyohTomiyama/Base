/*
このコードブロックは、以下の主要な部分で構成されています。
Attempt クラス: パッキングの試行結果をまとめるためのデータ構造。
Block クラス: Illustratorの PageItem をビンパッキングアルゴリズムが扱える「ブロック」形式に変換し、回転や配置のロジックをカプセル化します。
Illustratorユーティリティ関数群:
getItemBoundsIllustrator: Illustratorの PageItem のバウンディングボックス（境界線）を取得します。グループやテキストなど、複雑なアイテムのバウンディングボックス取得に対応しています。
combineBounds: 複数のバウンディングボックスを統合し、それらすべてを含む最小の矩形を計算します。
intersectionOfBounds: 複数のバウンディングボックスの共通の重なり合う領域を計算します。
boundsDoIntersect: 2つのバウンディングボックスが交差するかどうかを判定します。
drawRectangleIllustrator: デバッグ用にIllustratorドキュメントに矩形を描画します。
shuffle: 配列をランダムにシャッフルするユーティリティ関数。
divideBounds / divideByGuides: Illustratorのガイドを使って領域を分割する関数。
getUnitStringAsPoints: 文字列で表された単位（例: '10 mm'）をポイント単位に変換します。
*/

/**
 * Creates a "packing attempt" object.
 * @param {Array<bin>} bins - the bins in use.
 * @returns {Attempt}
 */
// パッキングアルゴリズムが複数回試行される場合（例: 異なるソート順や回転の組み合わせを試す場合）に、各試行の結果を格納するためのコンテナ。
function Attempt(index, bins) {

    this.area = 0; //パックされた全ブロックの合計面積
    this.bins = bins; //使用されたビンの数
    this.binCount = bins.length; //使用されたビンのリスト（ここではIllustratorのアートボードを想定）
    this.count = 0; //使用されたビンの数
    this.index = index; //この試行の識別インデックス
    this.info = []; //追加情報（デバッグ用など）
    this.score = 0; //この試行のパッキング効率や評価スコア

    this.packedBlocks = []; //この試行で正常にパックされた Block オブジェクトの配列
    this.remainingBlocks = []; //この試行でパックできなかった Block オブジェクトの配列

};

/**
 * Blocks are used to keep track
 * of items during packing.
 * @author m1b
 * @version 2024-10-14
 * @param {Object} settings -
 * @param {PageItem} item - a Page Item.
 */
// Illustratorの PageItem を、ビンパッキングアルゴリズムが内部的に扱いやすいように変換し、そのサイズ、位置、回転状態を管理します。
function Block(settings, item, index) {
    /*
    settings: パディング、マージン、強制回転などの設定を含むオブジェクト。
    item: 元のIllustratorの PageItem オブジェクト。
    index: このブロックの識別インデックス。
    */

    var bounds = getItemBoundsIllustrator(item)
    if (bounds != null) {
        this.item = item; //元のIllustrator PageItem への参照
        this.index = index; //ブロックのインデックス
        this.doc = settings.doc;
        this.padding = settings.padding;
        this.margin = settings.margin;
        this.isRotated = false;

        // どのビン（アートボード）に配置されたかを示すインデックス。パッキング後（Packer によって）設定される
        this.binIndex = undefined;

        this.w = bounds[2] - bounds[0] + this.padding;
        this.h = bounds[1] - bounds[3] + this.padding;
        this.dx = item.left - bounds[0];
        this.dy = item.top - bounds[1];

        this.dimensions = {
            w: this.w,
            h: this.h,
            dx: this.dx,
            dy: this.dy,
        };

        this.rotatedDimensions = {
            w: this.h,
            h: this.w,
            dx: -this.dy,
            dy: item.visibleBounds[2] - bounds[2],
        }

        if (true === settings.forceRotate)
            this.rotate();
    } else {
        this.index = "out";
    }
};

// swap block between 0 and 90 degree rotation
// ブロックの w, h, dx, dy を、dimensions と rotatedDimensions の間で切り替えることで、90度回転をシミュレートします。
Block.prototype.rotate = function () {

    if (this.w == this.h) return;

    this.isRotated = !this.isRotated;
    this.w = this.isRotated ? this.rotatedDimensions.w : this.dimensions.w;
    this.h = this.isRotated ? this.rotatedDimensions.h : this.dimensions.h;
    this.dx = this.isRotated ? this.rotatedDimensions.dx : this.dimensions.dx;
    this.dy = this.isRotated ? this.rotatedDimensions.dy : this.dimensions.dy;

};

/**
 * Position the Block's item on an Illustrator Artboard.
 * @param {Object} settings - the packing settings.
 */
// このブロックが実際にパックされた場合 (self.packed が true の場合) に、元のIllustratorの item を指定されたアートボード上に配置します。
Block.prototype.positionItemOnArtboard = function (settings) {

    var self = this;

    if (!self.packed || self.index == "out")
        return;

    if (self.isRotated)
        self.item.rotate(90);

    var artboardRect = self.doc.artboards[self.binIndex].artboardRect,
        l = self.x0 + artboardRect[0] + self.margin,
        t = -(self.y0 - artboardRect[1] + self.margin),
        r = self.x1 + artboardRect[0] + self.margin,
        b = -(self.y1 - artboardRect[1] + self.margin);

    if (settings.showBlockBounds)
        var r = drawRectangleIllustrator(self.item.parent, [l, t, r, b]);

    if (settings.showOnlyBlockBounds)
        return;

    // position the item
    self.item.left = l + self.dx;
    self.item.top = t + self.dy;

};

// just for debugging
Block.prototype.toString = function () {

    if (!this.packed)
        return '[Object Block, not packed]';

    return '[Object Block, bin:' + this.binIndex
        + ', isRotated:' + this.isRotated
        + ', x0:' + this.x0
        + ', y0:' + this.y0
        + ', w:' + this.w
        + ', h:' + this.h
        + ']';

};

function getItemBoundsIllustrator(item) {
    boundsKey = 'visibleBounds';
    if (item.typename == "RasterItem" || item.typename == "PlacedItem") {
        return item[boundsKey];
    } else {
        return null;
    }
};

/**
 * Returns the combined bounds of all bounds supplied.
 * Works with Illustrator or Indesign bounds.
 * @author m1b
 * @version 2024-03-09
 * @param {Array<bounds>} boundsArray - an array of bounds [L, T, R, B] or [T, L , B, R].
 * @returns {bounds?} - the combined bounds.
 */
function combineBounds(boundsArray) {

    var combinedBounds = boundsArray[0],
        comparator = [Math.min, Math.max, Math.max, Math.min];

    // iterate through the rest of the bounds
    for (var i = 1; i < boundsArray.length; i++) {

        var bounds = boundsArray[i];

        combinedBounds = [
            comparator[0](combinedBounds[0], bounds[0]),
            comparator[1](combinedBounds[1], bounds[1]),
            comparator[2](combinedBounds[2], bounds[2]),
            comparator[3](combinedBounds[3], bounds[3]),
        ];

    }

    return combinedBounds;

};

/**
 * Returns the overlapping rectangle
 * of two or more rectangles.
 * NOTE: Returns undefined if ANY
 * rectangles do not intersect.
 * @author m1b
 * @version 2024-09-05
 * @param {Array<bounds>} arrayOfBounds - an array of bounds [L, T, R, B] or [T, L , B, R].
 * @returns {bounds?} - intersecting bounds.
 */
function intersectionOfBounds(arrayOfBounds) {

    var comparator = [Math.max, Math.min, Math.min, Math.max];

    // sort a copy of array
    var bounds = arrayOfBounds
        .slice(0)
        .sort(function (a, b) { return b[0] - a[0] || a[1] - b[1] });

    // start with first bounds
    var intersection = bounds.shift(),
        b;

    // compare each bounds, getting smaller
    while (b = bounds.shift()) {

        // if doesn't intersect, bail out
        if (!boundsDoIntersect(intersection, b))
            return;

        intersection = [
            comparator[0](intersection[0], b[0]),
            comparator[1](intersection[1], b[1]),
            comparator[2](intersection[2], b[2]),
            comparator[3](intersection[3], b[3]),
        ];

    }

    return intersection;

};

/**
 * Returns true if the two bounds intersect.
 * @author m1b
 * @version 2024-03-10
 * @param {Array} bounds1 - bounds array.
 * @param {Array} bounds2 - bounds array.
 * @param {Boolean} [TLBR] - whether bounds arrays are interpreted as [t, l, b, r] or [l, t, r, b] (default: based on app).
 * @returns {Boolean}
 */
function boundsDoIntersect(bounds1, bounds2, TLBR) {

    if (undefined == TLBR)
        TLBR = false;

    return !(

        TLBR

            // TLBR
            ? (
                bounds2[0] > bounds1[2]
                || bounds2[1] > bounds1[3]
                || bounds2[2] < bounds1[0]
                || bounds2[3] < bounds1[1]
            )

            // LTRB
            : (
                bounds2[0] > bounds1[2]
                || bounds2[1] < bounds1[3]
                || bounds2[2] < bounds1[0]
                || bounds2[3] > bounds1[1]
            )
    );

};

/**
 * Draws a rectangle to the document.
 * @param {Document|Layer|GroupItem} container - an Illustrator container.
 * @param {Array<Number>} bounds - [T, L, B, R]
 * @param {Object} props - properties to assign to the rectangle.
 * @return {PathItem}
 */
function drawRectangleIllustrator(container, bounds, properties) {

    properties = properties || {};

    var rectangle = container.rectangles.add(bounds[1], bounds[0], bounds[2] - bounds[0], -(bounds[3] - bounds[1])); // TLWH

    // defaults
    rectangle.filled = false;
    rectangle.stroked = true;

    // apply properties
    for (var key in properties)
        if (properties.hasOwnProperty(key))
            rectangle[key] = properties[key];

    return rectangle;

};

/**
 * Shuffles `things` array into random order;
 * Based on Fischer Yates algorithm.
 * @param {Array<*>} things - the things to shuffle.
 * @returns {Array<*>}
 */
// Fisher-Yatesシャッフルアルゴリズムに基づいて、配列内の要素をランダムな順序に並び替えます。
function shuffle(things) {

    // randomises order of an array
    if (!things)
        throw Error("shuffle: no `things` supplied.");

    var i = things.length,
        j = 0,
        temp;

    while (i--) {

        j = Math.floor(Math.random() * (i + 1));
        // swap randomly chosen element with current element
        temp = things[i];
        things[i] = things[j];
        things[j] = temp;

    }

    return things.slice(0);

};

function rotate(item) {

}

/**
 * Returns an array of bounds, formed by dividing `bounds`
 * using guides as dividers with `margin` on either side
 * of each guide.
 * @author m1b
 * @version 2024-10-13
 * @param {Array<Number>} bounds - the bounds to divide [T,L,B,R].
 * @param {Array<Guide>} guides - the guides to divide with.
 * @param {Number} [margin] - the margin on either side of a guide (default: 0).
 * @returns {bounds} - [T,L,B,R]
 */
function divideBounds(bounds, guides, margin) {

    margin = margin || 0;

    var dividedBounds = [bounds.slice()];

    // sort guides
    guides.sort(function (a, b) { return b.location - a.location });

    // separate horizontal from vertical guides
    var horizontalGuides = [];
    var verticalGuides = [];

    for (var i = 0; i < guides.length; i++) {

        if (HorizontalOrVertical.HORIZONTAL === guides[i].orientation)
            horizontalGuides.push(guides[i]);

        else if (HorizontalOrVertical.VERTICAL === guides[i].orientation)
            verticalGuides.push(guides[i]);

    }

    // divide by horizontal guides (split vertically)
    dividedBounds = divideByGuides(dividedBounds, horizontalGuides, true);

    // Divide by vertical guides (split horizontally)
    dividedBounds = divideByGuides(dividedBounds, verticalGuides, false);

    return dividedBounds;

    /**
     * Helper function: splits each bounds in `boundsArray` by guides in `guides` array.
     * @author m1b
     * @version 2024-10-13
     * @param {Array<bounds>} boundsArray - array of bounds to divide [ [T,L,B,R], [T,L,B,R], ... ].
     * @param {Array<Guide>} guides - the guides to divide with.
     * @param {Boolean} isHorizontal - orientation of the guides (do not mix orientations!)
     * @returns {Array<bounds>}
     */
    function divideByGuides(boundsArray, guides, isHorizontal) {

        guidesLoop:
        for (var i = 0; i < guides.length; i++) {

            var guideLocation = guides[i].location,
                newBounds = [];

            boundsLoop:
            for (var j = 0; j < boundsArray.length; j++) {

                var currentBounds = boundsArray[j],
                    top = currentBounds[0],
                    left = currentBounds[1],
                    bottom = currentBounds[2],
                    right = currentBounds[3];

                if (isHorizontal) {

                    // horizontal guide, split vertically
                    if (top < guideLocation && bottom > guideLocation) {
                        newBounds.push([top, left, guideLocation - margin, right]);
                        newBounds.push([guideLocation + margin, left, bottom, right]);
                    }

                    else {
                        // no split needed, just add the bounds as is
                        newBounds.push(currentBounds);
                    }

                }

                else {

                    // vertical guide, split horizontally
                    if (left < guideLocation && right > guideLocation) {
                        newBounds.push([top, left, bottom, guideLocation - margin]);
                        newBounds.push([top, guideLocation + margin, bottom, right]);
                    }

                    else {
                        // no split needed, just add the bounds as is
                        newBounds.push(currentBounds);
                    }

                }

            }

            // update boundsArray with the new sections created at this guide
            boundsArray = newBounds;

        }

        return boundsArray;

    };

};

/**
 * Returns `str` converted to points.
 * eg. '10 mm' returns 28.34645669,
 *     '1 inch' returns 72
 * @author m1b
 * @version 2024-09-10
 * @param {String} str - the string to parse.
 * @returns {Number}
 */
function getUnitStringAsPoints(str) {

    if ('Number' === str.constructor.name)
        return str;

    var rawNumber = Number((str.match(/[\d.-]+/) || 0)[0])

    if (isNaN(rawNumber))
        return;

    var convertToPoints = 1;

    if (str.search(/mm/) != -1)
        convertToPoints = 2.834645669;

    else if (str.search(/cm/) != -1)
        convertToPoints = 28.34645669;

    else if (str.search(/(in|inch|\")/) != -1)
        convertToPoints = 72;

    return (rawNumber * convertToPoints);

};
