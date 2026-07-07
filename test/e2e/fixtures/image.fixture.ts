import { DataSource, Repository } from 'typeorm';
import { ImageStatusEnum } from 'src/enums/ImageStatusEnum';
import { Image } from 'src/modules/image/entities/image.entity';

const defaultImage = (): Partial<Image> => ({
    path: 'images/test.webp',
    originalName: 'test.jpg',
    title: 'Test image',
    mimetype: 'image/webp',
    width: 800,
    height: 600,
    status: ImageStatusEnum.UPLOADED,
});

export function getImageRepository(
    dataSource: DataSource,
): Repository<Image> {
    return dataSource.getRepository(Image);
}

export async function createImage(
    dataSource: DataSource,
    overrides: Partial<Image> = {},
): Promise<Image> {
    const repository = getImageRepository(dataSource);

    return repository.save(
        repository.create({
            ...defaultImage(),
            ...overrides,
        }),
    );
}

export async function createImages(
    dataSource: DataSource,
    items: Partial<Image>[],
): Promise<Image[]> {
    const images: Image[] = [];

    for (const overrides of items) {
        images.push(await createImage(dataSource, overrides));
    }

    return images;
}
