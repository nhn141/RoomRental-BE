const db = require('../db/db');

class Province {
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM public.provinces WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findAll() {
        const result = await db.query(
            'SELECT * FROM public.provinces ORDER BY name'
        );
        return result.rows;
    }

    static async search(keyword) {
        const result = await db.query(
            `SELECT * FROM public.provinces 
             WHERE name ILIKE $1 OR full_name ILIKE $1 OR name_slug ILIKE $1
             ORDER BY name`,
            [`%${keyword}%`]
        );
        return result.rows;
    }

    static async create(provinceData) {
        const { id, name, name_slug, full_name, type } = provinceData;
        const result = await db.query(
            `INSERT INTO public.provinces (id, name, name_slug, full_name, type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, name, name_slug, full_name, type]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await db.query('DELETE FROM public.provinces WHERE id = $1', [id]);
    }

    static async getWithWardsCount(id) {
        const result = await db.query(
            `SELECT p.*, COUNT(w.id) as wards_count
             FROM public.provinces p
             LEFT JOIN public.wards w ON p.id = w.province_id
             WHERE p.id = $1
             GROUP BY p.id, p.name, p.name_slug, p.full_name, p.type`,
            [id]
        );
        return result.rows[0];
    }
}

module.exports = Province;
