let context;
let enemies, walls, player;
let eBeam, pBeam;//ビーム（敵、プレイヤー）
let dir, nextDir, pdir, cnt, maxCnt;//移動方向（敵、プレイヤー）、カウンター
let status, score;//ステータス(ready/play/end/clear)、スコア
//絵文字コード
const char = {
    enemy0: "0x1F991", enemy1: "0x1F980", enemy2: "0x1F419", eBeam: "0x1F4A7",
    cannon: "0x1F5FC", pBeam: "0x26A1", wall: "0x1F3E2", explosion: "0x1F4A5"
};

//絵文字クラス
class Emoji {
    constructor(type, x, y, size, score = 0) {
        this.code = char[type];
        this.x = x;
        this.y = y;
        this.size = size;
        this.status = "alive";
        this.score = score;
    }
    update(x, y) {
        [this.x, this.y] = [this.x + x, this.y + y];//キャラクター移動
        drawText(this.code, this.x, this.y, this.size, "white");//キャラクターを描く
    }
}

const init = () => {
    //コンテキストの取得
    context = document.getElementById("stage").getContext("2d");
    //キーイベントの登録
    document.addEventListener("keydown", event => {
        if (status == "play") {
            if ((event.key == " ") && (pBeam == null)) {//スペースキーならビームを打つ
                pBeam = new Emoji("pBeam", player.x, player.y - 20, 15);
            }
            if (event.key == "ArrowLeft") pdir = -1;//←なら左へ
            if (event.key == "ArrowRight") pdir = 1;//→なら右へ
        }
    });
    document.addEventListener("keyup", event => {
        if ((event.key == "ArrowLeft") || (event.key == "ArrowRight")) pdir = 0;//放したのが矢印キーならプレイヤー止める
        if ((status != "play") && (event.key == "s")) startGame("play");//放したのがsキーならゲームスタート
    });
    startGame("ready");
    update();
}

const startGame = st => {
    //ゲーム開始
    [dir, nextDir, pdir, cnt, maxCnt, status, score] = [1, 0, 0, 30, 30, st, 0];
    [enemies, walls, eBeam, pBeam] = [[], [], [], null];//敵、トーチカ、スコア等の初期化

    for (let i = 0; i < 11; i++) {//敵は11機×５列
        for (let j = 0; j < 5; j++) {
            const k = Math.ceil(j / 2);
            enemies.push(new Emoji("enemy"+k, i * 40 + 60, j * 40 + 60, 30, 30 - 10 * k));//3種類の敵を作成
        }
    }
    for (let i = 0; i < 7; i++) {//トーチカは7個×6列
        for (let j = 0; j < 6; j++) {
            if ((i > 1) && (i < 5) && (j > 3)) continue;//下のへこみ部分を飛ばす
            //トーチカを4基作成
            for (let k = 0; k < 4; k++) {
                walls.push(new Emoji("wall", i * 10 + k * 150 + 65, j * 10 + 350, 10));
            }
        }
    }
    player = new Emoji("cannon", 320, 450, 30);//プレイヤー作成
}

const update = () => {
    context.fillStyle = "black";
    context.fillRect(0, 0, 640, 480);
    //敵の移動、攻撃
    cnt--;
    let [dx, dy] = [0, 0];
    if ((status == "play") && (cnt == 0)) {//cntが0になるごとに
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].status == "alive") {
                const [x, y] = [enemies[i].x, enemies[i].y];

                if ((dir == -1) || (dir == 1)) [dx, dy] = [dir * 5, 0]//横に移動
                if (dir == 2)  [dx, dy] = [0, 10]//下に移動

                if (x + dx < 20) nextDir = 1//画面端なら次回逆方向に
                if (x + dx > 620) nextDir = -1//画面端なら次回逆方向に

                collideWalls(enemies[i], true);//壁に当たったら壁を消す

                if ((eBeam.length < 3) && (Math.random() < 0.05)) {//弾を撃つ（最大3発）    
                    eBeam.push(new Emoji("eBeam", x, y, 15));
                }
                if (y + dy > player.y - player.size) status = "end";//敵がプレイヤーの位置まで下りたら終了
            } else {
                enemies.splice(i, 1);//敵のstatusがdeadなら敵を消す
                i--;
            }
        }
        if (dir == 2) {//敵の移動方向調整
            [dir,nextDir] = [nextDir, 0];
        } else if (nextDir != 0) {
            dir = 2;
        }
        cnt = maxCnt;
    }
    //ビームの移動、当たり判定
    for (let i = 0; i < eBeam.length; i++) {
        eBeam[i].update(0, 3);//敵の弾を下に3移動

        if (collide(eBeam[i], player)) player.code = char["explosion"];//プレイヤーに敵の弾が当たったら爆発の絵文字に変える
        collideWalls(eBeam[i]);//敵の球がトーチカに当たったらトーチカを１個消す

        if ((eBeam[i].y > 480) || (eBeam[i].status == "dead")) {//敵の弾が下端から出るかstatusがdeadなら敵の弾を消す
            eBeam.splice(i, 1);
            i--;
        }
    }
    if (pBeam != null) {
        pBeam.update(0, -10);//プレイヤーのビームを上に10移動

        for (const enemy of enemies) {
            if (collide(pBeam, enemy)) {
                enemy.code = char["explosion"];//敵にビームが当たったら爆発の絵文字に変える
                [score, maxCnt] = [score + enemy.score, maxCnt - 1];//敵を1機やっつけるごとに敵の動きが速くなる（最小値2）
                if (maxCnt < 2) maxCnt = 2;
            }
        }
        collideWalls(pBeam);
        if ((pBeam.y < 0) || (pBeam.status == "dead")) pBeam = null;//ビームが画面上から出るかdeadなら消す
    }
    //プレイヤー、敵、壁の更新
    player.update(pdir * 2, 0);//プレイヤーを動かす
    if (player.x < 20) player.x = 20;//画面端なら止まる
    if (player.x > 620) player.x = 620;//画面端なら止まる
    if (player.status == "dead") status = "end";//deadなら終了
    enemies.forEach(enemy => enemy.update(dx, dy));//全ての敵を動かす
    if (enemies.length == 0) status = "clear";
    walls.forEach(wall => wall.update(0, 0));//トーチカを描画(移動しない)
    //スコア、ゲームオーバーの表示
    drawText(`SCORE: ${score}`, 10, 10, 20, "white", "left", "top");//スコア表示
    if (status == "end") drawText("GAMEOVER", 320, 200, 50, "lime");
    if (status == "clear") drawText("CLEAR!!", 320, 200, 50, "lime");
    if (status != "play") drawText("Press S key to start", 320, 280, 30, "lime");
    window.requestAnimationFrame(update);//アニメーションを行う
}

const collideWalls = (object, aliveCheck = false) => {//aliveCheckがtrueのとき壁じゃない方のstatusはaliveのまま
    //壁との当たり判定
    for (let i = 0; i < walls.length; i++) {
        if (collide(object, walls[i])) {//オブジェクトと壁が当たっていたら壁を消す
            walls.splice(i, 1);
            i--;
            if (aliveCheck) object.status = "alive";
        }
    }
}

const collide = (object1, object2) => {
    //当たり判定
    let check = false;
    if ((object1.status == "alive") && (object2.status == "alive")) {
        const d = Math.hypot(object1.x - object2.x, object1.y - object2.y);//指定したオブジェクト同士の距離
        if (d < (object1.size + object2.size) / 2) {//当たっていたら
            [check, object1.status, object2.status] = [true, "dead", "dead"];
        }
    }
    return check;
}

const drawText = (text, x, y, size, color, align = "center", base = "middle") => {
    //テキストの描画
    let [font, str] = ["Arial Black", text];
    if (text[0] == "0") [font, str] = ["sans-serif", String.fromCodePoint(text)];//textの先頭が0なら絵文字に変換
    [context.font, context.fillStyle] = [`${size}px ${font}`, color];
    [context.textAlign, context.textBaseline] = [align, base];
    context.fillText(str, x, y);
}