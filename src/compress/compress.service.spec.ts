import { Test, TestingModule } from '@nestjs/testing';
import { CompressService } from './compress.service';

describe('CompressService', () => {
  let service: CompressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompressService],
    }).compile();

    service = module.get<CompressService>(CompressService);
  });

  it('devrait compresser et décompresser correctement', async () => {
    const text = `<hr noshade="true" size="1" class="bucketDivider">
    <h2>Description du fabricant</h2>
    <div class="aplus-v2 desktop celwidget" cel_widget_id="aplus" data-csa-c-id="l2by4l-g8yxi3-28oxsf-ttx86r">
      <style type="text/css">
        .aplus-v2 .launchpad-module {
          max-width: 1000px;
          margin-left: auto;
          margin-right: auto;
        }
      </style>
      <div class="celwidget aplus-module launchpad-company-logo aplus-standard" cel_widget_id="aplus-launchpad-company-logo" data-csa-c-id="uklzbv-g2by4p-i7i8cz-34i2hn">
        <div class="a-section a-text-center launchpad-module launchpad-module-company-logo"> TEST </div>
      </div>
    </div>`;
    const compressed = await service.compress(text);
    expect(compressed).toBeDefined();

    const decompressed = await service.decompress(compressed);
    expect(decompressed).toBe(text);
  });

  it('devrait lever une erreur si la décompression échoue', async () => {
    await expect(service.decompress('invalid-base64')).rejects.toThrow();
  });
});
