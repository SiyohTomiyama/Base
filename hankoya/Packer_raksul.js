// オリジナルに日本語コメントをつけたもの

/**
 * Bin packing algorithm by trentium: https://stackoverflow.com/users/7696162/trentium
 * from here: https://stackoverflow.com/questions/56642111/bin-packing-js-implementation-using-box-rotation-for-best-fit
 *
 * modified by m1b to conform with ExtendScript syntax and minor functionality I wanted
 */

Packer = function (w, h, allowRotation) {
    this.allowRotation = (allowRotation == true);
    this.init(w, h);
};

// 与えられたビンの幅（w）と高さ（h）で、パッカー（箱詰め機）を初期化
// パッキングできる領域全体を表すルートブロック (_root) を作成
Packer.prototype.init = function (w, h) {
    this._root = { x: 0, y: 0, w: w, h: h }
};

// 2つのブロックが重なり合っている場合、その重なり合った領域を表す新しいブロックオブジェクトを返す
// 重なっていない場合は null
Packer.prototype.intersect = function (block0, block1) {
    var ix0 = Math.max(block0.x0, block1.x0);
    var ix1 = Math.min(block0.x1, block1.x1);
    var iy0 = Math.max(block0.y0, block1.y0);
    var iy1 = Math.min(block0.y1, block1.y1);

    if (ix0 <= ix1 && iy0 <= iy1) {
        return { x0: ix0, y0: iy0, x1: ix1, y1: iy1 };
    } else {
        return null;
    }
};

// heapBlock0 が heapBlock1 を完全に含んでいるかを判断
Packer.prototype.chunkContains = function (heapBlock0, heapBlock1) {
    return heapBlock0.x0 <= heapBlock1.x0 && heapBlock0.y0 <= heapBlock1.y0 && heapBlock1.x1 <= heapBlock0.x1 && heapBlock1.y1 <= heapBlock0.y1;
};

// 2つのブロックが隣接しているか、または一部が重なっている場合に、それぞれのブロックを拡張して、共通の領域をできるだけ多く含むように調整する
// ただし、このメソッド単体では heapBlock0 と heapBlock1 が互いに拡張し合う関係が固定されているため、後続の unionMax や unionAll でより一般的な結合処理が行われる
// このメソッドは、unionMax 内で特定の場合（ブロックが完全に含まれていないが重なっている場合）に呼び出される
Packer.prototype.expand = function (heapBlock0, heapBlock1) {
    if (heapBlock0.x0 <= heapBlock1.x0 && heapBlock1.x1 <= heapBlock0.x1 && heapBlock1.y0 <= heapBlock0.y1) {
        heapBlock1.y0 = Math.min(heapBlock0.y0, heapBlock1.y0);
        heapBlock1.y1 = Math.max(heapBlock0.y1, heapBlock1.y1);
    }

    if (heapBlock0.y0 <= heapBlock1.y0 && heapBlock1.y1 <= heapBlock0.y1 && heapBlock1.x0 <= heapBlock0.x1) {
        heapBlock1.x0 = Math.min(heapBlock0.x0, heapBlock1.x0);
        heapBlock1.x1 = Math.max(heapBlock0.x1, heapBlock1.x1);
    }
};

// 2つのヒープブロックが交差する場合に、以下のいずれかの処理を行う
// 片方のブロックがもう一方を完全に含んでいれば、含まれている方のブロックを null に設定し、後で削除されるようにマーク
// 完全に含まれていないが重なり合っている場合は、expand メソッドを呼び出して、両方のブロックを相互に拡張する
// これは、空きスペースが隣接している場合に、それらを結合しようとする試み
Packer.prototype.unionMax = function (heapBlock0, heapBlock1) {
    //
    // Given two heap blocks, determine whether...
    //
    if (heapBlock0 && heapBlock1) {
        // ...heapBlock0 and heapBlock1 intersect, and if so...
        var i = this.intersect(heapBlock0, heapBlock1);
        if (i) {
            if (this.chunkContains(heapBlock0, heapBlock1)) {
                // ...if heapBlock1 is contained by heapBlock0...
                heapBlock1 = null;
            } else if (this.chunkContains(heapBlock1, heapBlock0)) {
                // ...or if heapBlock0 is contained by heapBlock1...
                heapBlock0 = null;
            } else {
                // ...otherwise, var's expand both heapBlock0 and
                // heapBlock1 to encompass as much of the intersected
                // space as possible.  In this instance, both heapBlock0
                // and heapBlock1 will overlap.
                this.expand(heapBlock0, heapBlock1);
                this.expand(heapBlock1, heapBlock0);
            }
        }
    }
};

// this.heap: 現在利用可能な空きスペース（ヒープブロック）の配列
// heap 配列内のすべての空きスペースをループし、unionMax を使って重複する空きスペースを削除したり、隣接・重なり合う空きスペースを結合したりして整理する
// 処理後、null になったエントリを除外して、新しい整理された heap 配列を作成
Packer.prototype.unionAll = function () {
    for (var i = 0; i < this.heap.length; i++) {
        for (var j = 0; j < this.heap.length; j++) {
            if (i !== j) {
                this.unionMax(this.heap[i], this.heap[j]);
                if (this.heap[i] && this.heap[j]) {
                    if (this.chunkContains(this.heap[j], this.heap[i])) {
                        this.heap[i] = null;
                    } else if (this.chunkContains(this.heap[i], this.heap[j])) {
                        this.heap[j] = null;
                    }
                }
            }
        }
    }
    // Eliminate the duplicative (ie, nulled) heapBlocks.
    var onlyBlocks = [];
    for (var i = 0; i < this.heap.length; i++) {
        if (this.heap[i]) {
            onlyBlocks.push(this.heap[i]);
        }
    }
    this.heap = onlyBlocks;
};

// ブロックの配置試行
Packer.prototype.fit = function (blocks, binIndex) {

    // パッキング可能な空きスペースを管理する「ヒープ (heap)」という配列を初期化
    // 最初はビン全体が空きスペースとしてヒープに入っている
    this.heap = [{
        x0: 0,
        y0: 0,
        x1: this._root.w,
        y1: this._root.h
    }];

    var n,
        block,
        area = 0,
        packedBlocks = [],
        remainingBlocks = [];

    // 各ブロックについて、ヒープ内の既存の空きスペースに収まるかを確認
    // 収まらない場合、回転が許可されていれば、ブロックを90度回転
    // 収まったブロックは packedBlocks に追加され、収まらなかったブロックは remainingBlocks に残される
    for (n = 0; n < blocks.length; n++) {

        block = blocks[n];

        if (this.findInHeap(block)) {
            this.adjustHeap(block);
        }

        else if (this.allowRotation) {
            // If the block didn't fit in its current orientation,
            // rotate its dimensions and look again.
            block.rotate();

            if (this.findInHeap(block))
                this.adjustHeap(block);

        }

        // was it packed?
        if (block.packed) {
            block.binIndex = binIndex;
            packedBlocks.push(block);
            area += block.w * block.h;
        }

        else {
            remainingBlocks.push(block);
        }

    }

    return {
        count: packedBlocks.length,
        area: area,
        packedBlocks: packedBlocks,
        remainingBlocks: remainingBlocks,
    };
};

// this.heap（空きスペースのリスト）をループし、block がその中に収まるだけの十分な大きさの空きスペース（heapBlock）があるかどうかを探す
// 見つかった場合、block の位置 (x0, y0, x1, y1) をその空きスペースの左上隅に合わせて設定し、block.packed = true とマークして true を返す
// 収まる空きスペースが見つからなければ false を返す
Packer.prototype.findInHeap = function (block) {
    //
    // Find a heapBlock that can contain the block.
    //
    for (var i = 0; i < this.heap.length; i++) {
        var heapBlock = this.heap[i];
        if (
            heapBlock
            && block.w <= heapBlock.x1 - heapBlock.x0
            && block.h <= heapBlock.y1 - heapBlock.y0
        ) {
            block.x0 = heapBlock.x0;
            block.y0 = heapBlock.y0;
            block.x1 = heapBlock.x0 + block.w;
            block.y1 = heapBlock.y0 + block.h;
            block.packed = true;
            return true;
        }
    }
    return false;
};

// 「MaxRectsBinPack」アルゴリズムの考え方に似ている
// block が配置されたことで、既存の空きスペース（heapBlock）がどのように変化するかを計算し、this.heap を更新する
// block と重なる heapBlock を intersect で見つけ、それをnullとマーク。
// 重なった部分を取り除いた後の、heapBlock の残り部分を最大4つの新しい空きスペースとして this.heap に追加する（上、右、下、左のL字型に残る可能性のあるスペース）
// 最後に this.unionAll() を呼び出し、新たに追加された空きスペースを含めてヒープ全体の整理を行う
Packer.prototype.adjustHeap = function (block) {
    var n = this.heap.length;
    for (var i = 0; i < n; i++) {
        var heapBlock = this.heap[i];
        var overlap = this.intersect(heapBlock, block);
        if (overlap) {

            // Top
            if (overlap.y1 !== heapBlock.y1) {
                this.heap.push({
                    x0: heapBlock.x0,
                    y0: overlap.y1,
                    x1: heapBlock.x1,
                    y1: heapBlock.y1
                });
            }

            // Right
            if (overlap.x1 !== heapBlock.x1) {
                this.heap.push({
                    x0: overlap.x1,
                    y0: heapBlock.y0,
                    x1: heapBlock.x1,
                    y1: heapBlock.y1
                });
            }

            // Bottom
            if (heapBlock.y0 !== overlap.y0) {
                this.heap.push({
                    x0: heapBlock.x0,
                    y0: heapBlock.y0,
                    x1: heapBlock.x1,
                    y1: overlap.y0
                });
            }

            // Left
            if (heapBlock.x0 != overlap.x0) {
                this.heap.push({
                    x0: heapBlock.x0,
                    y0: heapBlock.y0,
                    x1: overlap.x0,
                    y1: heapBlock.y1
                });
            }

            this.heap[i] = null;
        }
    }

    this.unionAll();
};

Packer.prototype.destroy = function () {
    this.heap = null;
};
