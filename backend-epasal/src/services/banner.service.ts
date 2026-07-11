import { Banner } from '../models/Banner';
import { ICreateBannerBody, IPaginationQuery } from '../types';
import { generateId } from '../utils/generateId';
import { NotFoundError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';

export class BannerService {
  /**
   * Get all banners with pagination and filters
   */
  async getBanners(query: IPaginationQuery) {
    const { sortBy = 'created_at', order = 'desc' } = query;
    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });

    const filter: any = {};
    const sortOrder = order === 'asc' ? 1 : -1;

    const [banners, total] = await Promise.all([
      Banner.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('-_id -__v'),
      Banner.countDocuments(filter),
    ]);

    return {
      banners: Array.isArray(banners) ? banners : [],
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string) {
    const banner = await Banner.findOne({ id }).lean().select('-_id -__v');

    if (!banner) {
      throw new NotFoundError('Banner not found');
    }

    return banner;
  }

  /**
   * Create new banner
   */
  async createBanner(data: ICreateBannerBody, imageUrl?: string) {
    const id = generateId('banner');
    const created_at = new Date().toISOString();

    const bannerData = {
      id,
      ...data,
      imageUrl: imageUrl || null,
      created_at,
    };

    const banner = await Banner.create(bannerData);
    return banner.toObject({ versionKey: false, transform: (_doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }});
  }

  /**
   * Update banner
   */
  async updateBanner(id: string, data: Partial<ICreateBannerBody>, imageUrl?: string) {
    const banner = await Banner.findOne({ id });

    if (!banner) {
      throw new NotFoundError('Banner not found');
    }

    if (imageUrl) {
      (data as any).imageUrl = imageUrl;
    }

    Object.assign(banner, data);
    await banner.save();

    return banner.toObject({ versionKey: false, transform: (_doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }});
  }

  /**
   * Delete banner
   */
  async deleteBanner(id: string) {
    const banner = await Banner.findOneAndDelete({ id });

    if (!banner) {
      throw new NotFoundError('Banner not found');
    }

    return { message: 'Banner deleted successfully' };
  }

  /**
   * Get active banners
   */
  async getActiveBanners() {
    const banners = await Banner.find({ isActive: true })
      .sort({ created_at: -1 })
      .lean()
      .select('-_id -__v');

    return Array.isArray(banners) ? banners : [];
  }
}

export default new BannerService();
