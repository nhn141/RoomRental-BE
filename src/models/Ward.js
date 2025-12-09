const db = require('../db/db');

class Ward {
    static async findById(id) {
        const result = await db.query(
            `SELECT w.*, p.full_name as province_name
             FROM public.wards w
             LEFT JOIN public.provinces p ON w.province_id = p.id
             WHERE w.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async findByProvinceId(province_id) {
        const result = await db.query(
            `SELECT * FROM public.wards 
             WHERE province_id = $1
             ORDER BY name`,
            [province_id]
        );
        return result.rows;
    }

    static async findAll() {
        const result = await db.query(
            `SELECT w.*, p.full_name as province_name
             FROM public.wards w
             LEFT JOIN public.provinces p ON w.province_id = p.id
             ORDER BY w.name`
        );
        return result.rows;
    }

    static async search(province_id, keyword) {
        const result = await db.query(
            `SELECT * FROM public.wards 
             WHERE province_id = $1 
             AND (name ILIKE $2 OR slug ILIKE $2 OR name_with_type ILIKE $2)
             ORDER BY name`,
            [province_id, `%${keyword}%`]
        );
        return result.rows;
    }

    static async create(wardData) {
        const { id, province_id, name, slug, type, name_with_type, path, path_with_type } = wardData;
        const result = await db.query(
            `INSERT INTO public.wards (id, province_id, name, slug, type, name_with_type, path, path_with_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [id, province_id, name, slug, type, name_with_type, path, path_with_type]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await db.query('DELETE FROM public.wards WHERE id = $1', [id]);
    }
}

module.exports = Ward;
