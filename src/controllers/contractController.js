const { Contract, RentalPost, Tenant, Landlord } = require('../models');

class ContractController {
    // CREATE - Tenant tạo contract mới
    async createContract(req, res) {
        try {
            // Chỉ tenant mới được tạo contract
            if (req.user.role !== 'tenant') {
                return res.status(403).json({ message: 'Chỉ tenant mới có quyền tạo hợp đồng.' });
            }

            const {
                post_id, start_date, end_date, monthly_rent, deposit_amount, contract_url
            } = req.body;

            // Validation
            if (!post_id || !start_date || !end_date) {
                return res.status(400).json({
                    message: 'Thiếu thông tin bắt buộc: post_id, start_date, end_date'
                });
            }

            // Date validation: end_date must be after start_date and at least 30 days later
            const sd = new Date(start_date);
            const ed = new Date(end_date);
            if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
                return res.status(400).json({ message: 'Ngày không hợp lệ' });
            }
            const diffMs = ed - sd;
            const minMs = 30 * 24 * 60 * 60 * 1000; // 30 days
            if (diffMs <= 0) {
                return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
            }
            if (diffMs < minMs) {
                return res.status(400).json({ message: 'Thời hạn hợp đồng phải ít nhất 30 ngày' });
            }

            // Check if post exists and is approved
            const post = await RentalPost.findById(post_id);
            if (!post) {
                return res.status(404).json({ message: 'Bài đăng không tồn tại' });
            }

            if (post.status !== 'approved') {
                return res.status(400).json({ message: 'Chỉ có thể tạo hợp đồng cho bài đăng đã được duyệt' });
            }

            // Check if tenant already has contract for this post
            const existingContract = await Contract.findByPostAndTenant(post_id, req.user.id);
            if (existingContract) {
                return res.status(400).json({ message: 'Bạn đã tạo hợp đồng cho bài đăng này' });
            }

            const contractData = {
                post_id,
                tenant_id: req.user.id,
                landlord_id: post.landlord_id,
                start_date,
                end_date: end_date || null,
                monthly_rent: monthly_rent || post.price,
                deposit_amount: deposit_amount || 0,
                contract_url: contract_url || null
            };

            const newContract = await Contract.create(contractData);

            // Update rental post: set is_available = false
            await RentalPost.update(post_id, { is_available: false });

            return res.status(201).json({
                message: 'Tạo hợp đồng thành công',
                contract: newContract
            });
        } catch (err) {
            console.error('Create Contract Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // READ - Lấy chi tiết contract
    async getContractById(req, res) {
        try {
            const { id } = req.params;
            const contract = await Contract.findById(id);

            if (!contract) {
                return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });
            }

            // Check permissions: chỉ tenant, landlord, hoặc admin mới xem được
            if (req.user.role === 'tenant' && contract.tenant_id !== req.user.id) {
                return res.status(403).json({ message: 'Bạn không có quyền xem hợp đồng này' });
            }

            if (req.user.role === 'landlord' && contract.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Bạn không có quyền xem hợp đồng này' });
            }

            return res.json({
                message: 'Lấy thông tin hợp đồng thành công',
                contract
            });
        } catch (err) {
            console.error('Get Contract By ID Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // READ - Lấy danh sách contracts (có filter và phân quyền)
    async getAllContracts(req, res) {
        try {
            const { status, post_id } = req.query;

            const filters = {
                status,
                post_id,
            };

            const contracts = await Contract.findAll(filters, req.user);

            return res.json({
                message: 'Lấy danh sách hợp đồng thành công',
                total: contracts.length,
                contracts
            });
        } catch (err) {
            console.error('Get All Contracts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // READ - Lấy contracts của tenant
    async getMyContracts(req, res) {
        try {
            if (req.user.role !== 'tenant') {
                return res.status(403).json({ message: 'Chỉ tenant mới có quyền xem hợp đồng của mình' });
            }

            const { status } = req.query;
            const contracts = await Contract.findByTenant(req.user.id, status);

            return res.json({
                message: 'Lấy danh sách hợp đồng thành công',
                total: contracts.length,
                contracts
            });
        } catch (err) {
            console.error('Get My Contracts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // READ - Lấy contracts của landlord
    async getLandlordContracts(req, res) {
        try {
            if (req.user.role !== 'landlord') {
                return res.status(403).json({ message: 'Chỉ landlord mới có quyền xem hợp đồng của mình' });
            }

            const { status } = req.query;
            const contracts = await Contract.findByLandlord(req.user.id, status);

            return res.json({
                message: 'Lấy danh sách hợp đồng thành công',
                total: contracts.length,
                contracts
            });
        } catch (err) {
            console.error('Get Landlord Contracts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // UPDATE - Cập nhật contract (chỉ landlord hoặc tenant chủ contract mới được)
    async updateContract(req, res) {
        try {
            const { id } = req.params;
            const contract = await Contract.findById(id);

            if (!contract) {
                return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });
            }

            // Chỉ landlord chủ bài hoặc tenant chủ contract mới được sửa
            if (req.user.role === 'landlord' && contract.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền chỉnh sửa hợp đồng này' });
            }

            if (req.user.role === 'tenant' && contract.tenant_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền chỉnh sửa hợp đồng này' });
            }

            const { start_date, end_date, monthly_rent, deposit_amount, contract_url, status } = req.body;

            const updates = {};
            if (start_date !== undefined) updates.start_date = start_date;
            if (end_date !== undefined) updates.end_date = end_date;

            // If start_date or end_date provided, validate their relation (end > start and >=30 days)
            if (start_date !== undefined || end_date !== undefined) {
                const newStart = start_date !== undefined ? new Date(start_date) : new Date(contract.start_date);
                const newEnd = end_date !== undefined ? new Date(end_date) : new Date(contract.end_date);
                if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
                    return res.status(400).json({ message: 'Ngày không hợp lệ' });
                }
                const diff = newEnd - newStart;
                const minMs2 = 30 * 24 * 60 * 60 * 1000;
                if (diff <= 0) {
                    return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
                }
                if (diff < minMs2) {
                    return res.status(400).json({ message: 'Thời hạn hợp đồng phải ít nhất 30 ngày' });
                }
            }
            if (monthly_rent !== undefined) updates.monthly_rent = monthly_rent;
            if (deposit_amount !== undefined) updates.deposit_amount = deposit_amount;
            if (contract_url !== undefined) updates.contract_url = contract_url;
            if (status !== undefined) {
                // Chỉ admin hoặc landlord mới được thay đổi status
                if (req.user.role !== 'admin' && req.user.role !== 'landlord') {
                    return res.status(403).json({ message: 'Không có quyền thay đổi trạng thái hợp đồng' });
                }
                updates.status = status;
            }

            const updatedContract = await Contract.update(id, updates);

            return res.json({
                message: 'Cập nhật hợp đồng thành công',
                contract: updatedContract
            });
        } catch (err) {
            console.error('Update Contract Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // DELETE - Xóa contract
    async deleteContract(req, res) {
        try {
            const { id } = req.params;
            const contract = await Contract.findById(id);

            if (!contract) {
                return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });
            }

            // Tenant chỉ xóa được hợp đồng của mình
            // Landlord xóa được hợp đồng liên quan đến bài của mình
            // Admin xóa được tất cả
            if (req.user.role === 'tenant' && contract.tenant_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền xóa hợp đồng này' });
            }

            if (req.user.role === 'landlord' && contract.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền xóa hợp đồng này' });
            }

            if (req.user.role !== 'tenant' && req.user.role !== 'landlord' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Không có quyền xóa hợp đồng' });
            }

            await Contract.delete(id);

            // Update rental post: set is_available = true
            await RentalPost.update(contract.post_id, { is_available: true });

            return res.json({
                message: 'Xóa hợp đồng thành công'
            });
        } catch (err) {
            console.error('Delete Contract Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // TERMINATE - Kết thúc hợp đồng (chỉ landlord hoặc admin)
    async terminateContract(req, res) {
        try {
            const { id } = req.params;
            const contract = await Contract.findById(id);

            if (!contract) {
                return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });
            }

            if (req.user.role !== 'landlord' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ landlord hoặc admin mới có quyền kết thúc hợp đồng' });
            }

            if (req.user.role === 'landlord' && contract.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Bạn không thể kết thúc hợp đồng này' });
            }

            if (contract.status === 'terminated') {
                return res.status(400).json({ message: 'Hợp đồng đã được kết thúc' });
            }

            const updatedContract = await Contract.updateStatus(id, 'terminated');

            // Update rental post: set is_available = true
            await RentalPost.update(contract.post_id, { is_available: true });

            return res.json({
                message: 'Kết thúc hợp đồng thành công',
                contract: updatedContract
            });
        } catch (err) {
            console.error('Terminate Contract Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
}

module.exports = new ContractController();
