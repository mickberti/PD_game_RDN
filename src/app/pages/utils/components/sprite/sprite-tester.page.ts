import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { AtlasConfigOption, AtlasService } from '../../../../core/services/ui/assets/atlas.service';
import { UiSpriteComponent } from 'src/app/shared/basic/ui-sprite.component';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';

interface AtlasFrame {
	frame: { x: number; y: number; w: number; h: number };
}

interface AtlasData {
	frames: Record<string, AtlasFrame>;
	meta?: { image?: string; size?: { w: number; h: number } };
}

interface PreviewFormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
}

interface BoolOption {
	id: string;
	label: string;
	value: boolean;
}

type SpriteFit = 'contain' | 'cover' | 'stretch' | 'none';
type SpriteAnchor =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'center-left'
	| 'center'
	| 'center-right'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right';

@Component({
	selector: 'app-sprite-tester',
	standalone: true,
	imports: [CommonModule, FormsModule, IonContent, UiSpriteComponent, IonToolbar, IonFooter, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
	templateUrl: './sprite-tester.page.html',
	styleUrls: ['./sprite-tester.page.scss']
})
export class SpriteTesterPage {
	readonly atlasOptions: AtlasConfigOption[] = this.atlasService.configuredAtlasOptions;

	readonly previewFormatOptions: PreviewFormatOption[] = [
	  { id: 'square-sm', label: 'Quadrato SM (80x80)', width: 80, height: 80 },
	  { id: 'square-md', label: 'Quadrato MD (160x160)', width: 160, height: 160 },
	  { id: 'square-lg', label: 'Quadrato LG (320x320)', width: 320, height: 320 },
	{ id: 'square-xlg', label: 'Quadrato XLG (640x640)', width: 640, height: 640 },
	  { id: 'rect-sm', label: 'Rettangolare SM (120x80)', width: 120, height: 80 },
	  { id: 'rect-md', label: 'Rettangolare MD (320x200)', width: 320, height: 200 },
	  { id: 'rect-lg', label: 'Rettangolare LG (440x280)', width: 440, height: 280 },
	{ id: 'rect-xlg', label: 'Rettangolare XLG (880x560)', width: 880, height: 560 }
	];

	readonly allowUpscaleOptions: BoolOption[] = [
		{ id: 'disabled', label: 'Disattivo', value: false },
		{ id: 'enabled', label: 'Attivo', value: true }
	];

	readonly fitOptions: SpriteFit[] = ['contain', 'cover', 'stretch', 'none'];
	readonly anchorOptions: SpriteAnchor[] = [
		'top-left',
		'top-center',
		'top-right',
		'center-left',
		'center',
		'center-right',
		'bottom-left',
		'bottom-center',
		'bottom-right'
	];
	
	selectedAtlasId = this.atlasOptions[0]?.id ?? '';
	selectedFrameName = '';
	selectedPreviewFormatId = this.previewFormatOptions[1]?.id ?? this.previewFormatOptions[0]?.id ?? '';
	panelWidth = 0;
	panelHeight = 0;
	allowUpscale = false;
	fit: SpriteFit = 'contain';
	anchor: SpriteAnchor = 'center';

	constructor(private readonly atlasService: AtlasService) {
		this.selectedFrameName = this.frameNames[0] ?? '';
		this.onPreviewFormatChange(this.selectedPreviewFormatId);
	}

	get selectedAtlas(): AtlasConfigOption {
		return this.atlasOptions.find((item) => item.id === this.selectedAtlasId) ?? this.atlasOptions[0];
	}

	get frameNames(): string[] {
		return Object.keys(this.selectedAtlas?.data.frames ?? {}).sort((a, b) => a.localeCompare(b));
	}

	onPreviewFormatChange(formatId: string): void {
	  this.selectedPreviewFormatId = formatId;
	  const selectedPreviewFormat: PreviewFormatOption = this.previewFormatOptions.find((item) => item.id === formatId) ?? this.previewFormatOptions[0];
	  this.panelHeight = selectedPreviewFormat.height;
	  this.panelWidth = selectedPreviewFormat.width;
	}
	
	onSelectedFrameNameChange(selectedFrameName: string){
		this.selectedFrameName = selectedFrameName;
	}
	
	onAtlasChange(): void {
		this.selectedFrameName = this.frameNames[0] ?? '';
	}

	get spriteStyle(): Record<string, string> {
		const atlas = this.selectedAtlas?.data;
		const frame = atlas?.frames[this.selectedFrameName];
		const image = atlas?.meta?.image;
		const atlasWidth = atlas?.meta?.size?.w;
		const atlasHeight = atlas?.meta?.size?.h;

		if (!frame || !image || !atlasWidth || !atlasHeight) {
			return {};
		}

		return {
			width: `${frame.frame.w}px`,
			height: `${frame.frame.h}px`,
			backgroundImage: `url(${image.startsWith('/') ? image : '/' + image})`,
			backgroundRepeat: 'no-repeat',
			backgroundPosition: `-${frame.frame.x}px -${frame.frame.y}px`,
			backgroundSize: `${atlasWidth}px ${atlasHeight}px`
		};
	}

	get panelStyle(): Record<string, string> {
		return {
			width: `${this.panelWidth}px`,
			height: `${this.panelHeight}px`
		};
	}
}
