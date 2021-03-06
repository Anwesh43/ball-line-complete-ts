const w : number = window.innerWidth 
const h : number = window.innerHeight 
const parts : number = 4 
const scGap : number = 0.02 / parts 
const strokeFactor : number = 90 
const sizeFactor : number = 3.9 
const colors : Array<string> = [
    "#F44336",
    "#3F51B5",
    "#4CAF50",
    "#FF9800",
    "#795548"
] 
const backColor : string = "#BDBDBD"
const delay : number = 20 
const rFactor : number = 30.3 

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }
    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawCircle(context : CanvasRenderingContext2D, x : number, y : number, r : number) {
        context.beginPath()
        context.arc(x, y, r, 0, 2 * Math.PI)
        context.fill()
    }

    static drawBallLine(context : CanvasRenderingContext2D, scale : number) {
        const sc1 : number = ScaleUtil.divideScale(scale, 0, 3)
        const sc2 : number = ScaleUtil.divideScale(scale, 1, 3)
        const sc3 : number = ScaleUtil.divideScale(scale, 2, 3)
        const size : number = Math.min(w, h) / sizeFactor 
        const r : number = Math.min(w, h) / rFactor
        context.save()
        context.translate(w / 2, h / 2)
        DrawingUtil.drawLine(context, -size + 2 * size * sc3, 0, -size + 2 * size * sc2, 0)
        var j = 0 
        const gap : number = (2 * size) / parts 
        var scTotal = 0 
        for (var j = 0; j < parts; j++) {
            scTotal += ScaleUtil.sinify(ScaleUtil.divideScale(sc2, j, parts))
        }
        for (var j = 0; j < 2; j++) {
            DrawingUtil.drawCircle(context, -size + 2 * size * sc2, gap * scTotal * (1 - 2 * j), r * (sc1 - sc3))
        }
        
        context.restore()
    }

    static drawBLCNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        DrawingUtil.drawBallLine(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0

    update(cb : Function) {
       this.scale += scGap * this.dir 
       if (Math.abs(this.scale - this.prevScale) > 1) {
           this.scale = this.prevScale + this.dir 
           this.dir = 0 
           this.prevScale = this.scale 
           cb()
       }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {
    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class BLCNode {

    prev : BLCNode 
    next : BLCNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new BLCNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        console.log(this.i, this.state.scale)
        DrawingUtil.drawBLCNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }
    
    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : BLCNode {
        var curr : BLCNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class BallLineComplete {

    curr : BLCNode = new BLCNode(0)
    dir : number = 1 

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}   

class Renderer {

    animator : Animator = new Animator()
    blc : BallLineComplete = new BallLineComplete()

    render(context : CanvasRenderingContext2D) {
        this.blc.draw(context)
    }

    handleTap(cb : Function) {
        this.blc.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.blc.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}