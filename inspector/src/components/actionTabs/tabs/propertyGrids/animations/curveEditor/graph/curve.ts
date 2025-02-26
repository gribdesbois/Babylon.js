import { Animation } from "babylonjs/Animations/animation";
import { Observable } from "babylonjs/Misc/observable";

export interface KeyEntry {
    frame: number;
    value: number;
    inTangent?: number;
    outTangent?: number;
}

export class Curve {
    public keys = new Array<KeyEntry>(); 
    public animation: Animation;   
    public color: string;
    public onDataUpdatedObservable = new Observable<void>();
    public property?: string;
    public tangentBuilder?: () => any;

    public static readonly TangentLength = 50;

    public constructor(color: string, animation: Animation, property?: string, tangentBuilder?: () => any) {
        this.color = color;
        this.animation = animation;
        this.property = property;
        this.tangentBuilder = tangentBuilder;
    }

    public gePathData(convertX: (x: number) => number, convertY: (y: number) => number, ) {
        const keys = this.keys;
        if (keys.length < 2) {
            return "";
        }

        let pathData = `M${convertX(keys[0].frame)} ${convertY(keys[0].value)}`;

        for (var keyIndex = 1; keyIndex < keys.length; keyIndex++) {
            const outTangent = keys[keyIndex - 1].outTangent || 0;
            const inTangent = keys[keyIndex].inTangent || 0;

            const prevFrame = keys[keyIndex - 1].frame;
            const currentFrame = keys[keyIndex].frame;
            const prevValue = keys[keyIndex - 1].value;
            const currentValue = keys[keyIndex].value;

            let controlPoint0Frame = prevFrame + (currentFrame - prevFrame) / 2;
            let controlPoint1Frame = prevFrame + (currentFrame - prevFrame) / 2;

            let controlPoint0Value: number;
            let controlPoint1Value: number;

            if (outTangent) {
                controlPoint0Frame = 2 * prevFrame / 3 + currentFrame / 3;
                controlPoint0Value = prevValue + outTangent / 3;
            } else {
                const animEval = this.animation.evaluate(controlPoint0Frame);
                controlPoint0Value = this.property ? animEval[this.property] : animEval;
            }

            if (inTangent) {
                controlPoint1Frame = prevFrame / 3 + 2 * currentFrame / 3;
                controlPoint1Value = currentValue - inTangent / 3;
            } else {
                const animEval = this.animation.evaluate(controlPoint1Frame);
                controlPoint1Value = this.property ? animEval[this.property] : animEval;
            }

            pathData += ` C${convertX(controlPoint0Frame)} ${convertY(controlPoint0Value)}, ${convertX(controlPoint1Frame)} ${convertY(controlPoint1Value)}, ${convertX(currentFrame)} ${convertY(currentValue)}`;
        }

        return pathData;
    }

    public getInControlPoint(keyIndex: number) {
        if (keyIndex === 0) {
            return null;
        }

        const keys = this.keys;
        const inTangent = keys[keyIndex].inTangent;

        if (inTangent) {
            const prevFrame = keys[keyIndex - 1].frame;
            const currentFrame = keys[keyIndex].frame;
            const currentValue = keys[keyIndex].value;

            const value = currentValue - inTangent / 3;
            const frame = prevFrame / 3 + 2 * currentFrame / 3;

            return {
                frame: frame,
                value: value
            }
        } else {
            const prevFrame = keys[keyIndex - 1].frame;                
            const currentFrame = keys[keyIndex].frame;
            const midFrame = prevFrame + (currentFrame - prevFrame) / 2;

            let evaluatedValue = this.animation.evaluate(midFrame);

            return {
                frame: midFrame,
                value: this.property ? evaluatedValue[this.property] : evaluatedValue
            }
        }
    }

    public getOutControlPoint(keyIndex: number) {
        const keys = this.keys;        
        if (keyIndex === keys.length - 1) {
            return null;
        }
        const outTangent = keys[keyIndex].outTangent;

        if (outTangent) {
            const prevFrame = keys[keyIndex].frame;        
            const prevValue = keys[keyIndex].value;
            const currentFrame = keys[keyIndex + 1].frame;

            const frame = 2 * prevFrame / 3 + currentFrame / 3;
            const value = prevValue + outTangent / 3;

            return {
                frame: frame,
                value: value
            }
        } else {
            const prevFrame = keys[keyIndex].frame;                
            const currentFrame = keys[keyIndex + 1].frame;
            const midFrame = prevFrame + (currentFrame - prevFrame) / 2;

            let evaluatedValue = this.animation.evaluate(midFrame);

            return {
                frame: midFrame,
                value: this.property ? evaluatedValue[this.property] : evaluatedValue
            }
        }
    }

    public updateInTangentFromControlPoint(keyId: number, value: number) {
        const slope = (this.keys[keyId].value - value);
        this.keys[keyId].inTangent = slope * (this.keys[keyId].inTangent ? 2 / 3 : 1 / 2);

        if (this.property) {
            if (!this.animation.getKeys()[keyId].inTangent) {
                this.animation.getKeys()[keyId].inTangent = this.tangentBuilder!();
            }

            this.animation.getKeys()[keyId].inTangent[this.property] = this.keys[keyId].inTangent;
        } else {
            this.animation.getKeys()[keyId].inTangent = this.keys[keyId].inTangent;
        }

        this.onDataUpdatedObservable.notifyObservers();
    }

    public updateOutTangentFromControlPoint(keyId: number, value: number) {
        const slope = (value - this.keys[keyId].value);
        this.keys[keyId].outTangent = slope * (this.keys[keyId].outTangent ? 2 / 3 : 1 / 2);

        if (this.property) {
            if (!this.animation.getKeys()[keyId].outTangent) {
                this.animation.getKeys()[keyId].outTangent = this.tangentBuilder!();
            }

            this.animation.getKeys()[keyId].outTangent[this.property] = this.keys[keyId].outTangent;
        } else {
            this.animation.getKeys()[keyId].outTangent = this.keys[keyId].outTangent;
        }

        this.onDataUpdatedObservable.notifyObservers();
    }

    public updateKeyFrame(keyId: number, frame: number) {
        this.keys[keyId].frame = frame;

        this.animation.getKeys()[keyId].frame = frame;

        this.onDataUpdatedObservable.notifyObservers();
    }

    public updateKeyValue(keyId: number, value: number) {
        this.keys[keyId].value = value;

        let sourceKey = this.animation.getKeys()[keyId];

        if (this.property) {
            sourceKey.value[this.property] = value;
        } else {
            sourceKey.value = value;
        }

        this.onDataUpdatedObservable.notifyObservers();
    }
}