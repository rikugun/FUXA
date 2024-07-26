import {Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit} from '@angular/core';
import { WebcamPlayerDialogData } from './webcam-player-dialog/webcam-player-dialog.component';
import { Utils } from '../../_helpers/utils';
import { HmiService } from '../../_services/hmi.service';
import Jessibuca from '../../../assets/lib/jessibuca/jessibuca';

@Component({
    selector: 'app-webcam-player',
    templateUrl: './webcam-player.component.html',
    styleUrls: ['./webcam-player.component.css']
})
export class WebcamPlayerComponent implements  AfterViewInit {

    @ViewChild('xgplayer', {static: true}) xgplayerRef: ElementRef;
    @Input() data: WebcamPlayerDialogData;
    @Output() onclose = new EventEmitter();
    player: any;


    constructor(private hmiService: HmiService) {
    }
    ngAfterViewInit(): void {
        let url = this.data.ga.property.variableValue;
        if (this.data.ga.property.variableId){
            let variable = this.hmiService.getMappedVariable(this.data.ga.property.variableId, false);
            if (!Utils.isNullOrUndefined(variable?.value)) {
                url = '' + variable.value;
            }
        }

        this.player = this.player = new Jessibuca({
            container: this.xgplayerRef.nativeElement,
            videoBuffer: 0.2, // 缓存时长
            isResize: false,
            loadingText: '加载中',
            debug: true,
            showBandwidth: true, // 显示网速
            operateBtns: {
                fullscreen: true,
                screenshot: true,
                play: true,
                audio: true,
            },
            forceNoOffscreen: true,
            isNotMute: false,
            decoder: 'assets/lib/jessibuca/decoder.js'
        });
        this.player.play(url);
    }

    private onClose($event) {
        if (this.onclose) {
            this.onclose.emit($event);
        }
    }
}
