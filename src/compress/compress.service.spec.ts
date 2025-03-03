import { Test, TestingModule } from '@nestjs/testing';
import { CompressService } from './compress.service';
import * as pako from 'pako';

describe('CompressService', () => {
  let service: CompressService;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompressService],
    }).compile();

    service = module.get<CompressService>(CompressService);
  });

  it('should compress and decompress correctly', async () => {
    const compressed = await service.compress(text);
    expect(compressed).toBeDefined();

    const decompressed = await service.decompress(compressed);
    expect(decompressed).toBe(text);
  });

  it('should throw an error if decompression fails', async () => {
    await expect(service.decompress('invalid-base64')).rejects.toThrow();
  });

  describe('With pako (for frontend)', () => {
    it('should compress and decompress correctly with pako', async () => {
      // 🔥 Compression avec zlib
      const compressed = await service.compress(text);

      // 🔥 Compression avec pako
      const pakoGzipped = pako.gzip(text);
      const pakoCompressed = Buffer.from(pakoGzipped).toString('base64');

      // ✅ Décompression avec pako
      const zlibDecompressed = pako.ungzip(Buffer.from(compressed, 'base64'), {
        to: 'string',
      });
      const pakoDecompressed = pako.ungzip(
        Buffer.from(pakoCompressed, 'base64'),
        { to: 'string' },
      );

      // 🏆 Vérification : les deux doivent donner le même texte d'origine
      expect(zlibDecompressed).toBe(text);
      expect(pakoDecompressed).toBe(text);
    });
  });
});
