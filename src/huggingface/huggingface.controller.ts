import { Controller, Post, Body, Param } from '@nestjs/common';
import { EHFModel, HuggingFaceService } from './huggingface.service';

@Controller('huggingface')
export class HuggingFaceController {
  constructor(private readonly huggingFaceService: HuggingFaceService) {}

  @Post('/ner/:model?')
  async analyzeNER(
    @Param('model') model: string,
    @Body() body: { text: string },
  ) {
    const { text } = body;
    if (!text) {
      return { error: 'text is required.' };
    }

    const modelKey = model ? EHFModel[model.toUpperCase()] : EHFModel.CAMEMBERT;

    try {
      const result = await this.huggingFaceService.analyzeText(text, modelKey);

      return this.huggingFaceService.transformEntities(result);
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('/sentiment/:model?')
  async analyzeSentiment(
    @Param('model') model: string,
    @Body() body: { text: string },
  ) {
    const { text } = body;
    if (!text) {
      return { error: 'text is required.' };
    }

    const modelKey = model ? EHFModel[model.toUpperCase()] : EHFModel.ROBERTA;

    try {
      const result = await this.huggingFaceService.analyzeText(text, modelKey);

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('mistral')
  async analyze(@Body() body: { text: string }) {
    const { text } = body;
    if (!text) {
      return { error: 'text is required.' };
    }

    try {
      const result = await this.huggingFaceService.analyzeText(
        text,
        EHFModel.MISTRAL,
      );

      return result;
    } catch (error) {
      return { error: error.message };
    }
  }
}
