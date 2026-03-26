const { contractRepository, rentalPostRepository } = require('../repositories');

class ContractService {
    async createContract(data, user) {
        try {
            if (user.role !== 'tenant') {
                return { status: 403, body: { message: 'Chỉ tenant mới có quyền tạo hợp đồng.' } };
            }

            const {
                post_id, start_date, end_date, monthly_rent, deposit_amount, contract_url
            } = data;

            if (!post_id || !start_date || !end_date) {
                return { status: 400, body: { message: 'Thiếu thông tin bắt buộc: post_id, start_date, end_date' } };
            }

            const sd = new Date(start_date);
            const ed = new Date(end_date);
            if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
                return { status: 400, body: { message: 'Ngày không hợp lệ' } };
            }
            const diffMs = ed - sd;
            const minMs = 30 * 24 * 60 * 60 * 1000;
            if (diffMs <= 0) {
                return { status: 400, body: { message: 'Ngày kết thúc phải sau ngày bắt đầu' } };
            }
            if (diffMs < minMs) {
                return { status: 400, body: { message: 'Thời hạn hợp đồng phải ít nhất 30 ngày' } };
            }

            const post = await rentalPostRepository.findById(post_id);
            if (!post) {
                return { status: 404, body: { message: 'Bài đăng không tồn tại' } };
            }

            if (post.status !== 'approved') {
                return { status: 400, body: { message: 'Chỉ có thể tạo hợp đồng cho bài đăng đã được duyệt' } };
            }

            const existingContract = await contractRepository.findByPostAndTenant(post_id, user.id);
            if (existingContract) {
                return { status: 400, body: { message: 'Bạn đã tạo hợp đồng cho bài đăng này' } };
            }

            const contractData = {
                post_id,
                tenant_id: user.id,
                landlord_id: post.landlord_id,
                start_date,
                end_date: end_date || null,
                monthly_rent: monthly_rent || post.price,
                deposit_amount: deposit_amount || 0,
                contract_url: contract_url || null
            };

            const newContract = await contractRepository.create(contractData);

            await rentalPostRepository.update(post_id, { is_available: false });

            return {
                status: 201,
                body: {
                    message: 'Tạo hợp đồng thành công',
                    contract: newContract
                }
            };
        } catch (err) {
            console.error('Create Contract Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getContractById(id, user) {
        try {
            const contract = await contractRepository.findById(id);

            if (!contract) {
                return { status: 404, body: { message: 'Không tìm thấy hợp đồng' } };
            }

            if (user.role === 'tenant' && contract.tenant_id !== user.id) {
                return { status: 403, body: { message: 'Bạn không có quyền xem hợp đồng này' } };
            }

            if (user.role === 'landlord' && contract.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Bạn không có quyền xem hợp đồng này' } };
            }

            return {
                status: 200,
                body: {
                    message: 'Lấy thông tin hợp đồng thành công',
                    contract
                }
            };
        } catch (err) {
            console.error('Get Contract By ID Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getAllContracts(filters, user) {
        try {
            const contracts = await contractRepository.findAll(filters, user);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách hợp đồng thành công',
                    total: contracts.length,
                    contracts
                }
            };
        } catch (err) {
            console.error('Get All Contracts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getMyContracts(userId, status) {
        try {
            const contracts = await contractRepository.findByTenant(userId, status);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách hợp đồng thành công',
                    total: contracts.length,
                    contracts
                }
            };
        } catch (err) {
            console.error('Get My Contracts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getLandlordContracts(userId, status) {
        try {
            const contracts = await contractRepository.findByLandlord(userId, status);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách hợp đồng thành công',
                    total: contracts.length,
                    contracts
                }
            };
        } catch (err) {
            console.error('Get Landlord Contracts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async updateContract(id, data, user) {
        try {
            const contract = await contractRepository.findById(id);

            if (!contract) {
                return { status: 404, body: { message: 'Không tìm thấy hợp đồng' } };
            }

            if (user.role === 'landlord' && contract.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền chỉnh sửa hợp đồng này' } };
            }

            if (user.role === 'tenant' && contract.tenant_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền chỉnh sửa hợp đồng này' } };
            }

            const { start_date, end_date, monthly_rent, deposit_amount, contract_url, status } = data;

            const updates = {};
            if (start_date !== undefined) updates.start_date = start_date;
            if (end_date !== undefined) updates.end_date = end_date;

            if (start_date !== undefined || end_date !== undefined) {
                const newStart = start_date !== undefined ? new Date(start_date) : new Date(contract.start_date);
                const newEnd = end_date !== undefined ? new Date(end_date) : new Date(contract.end_date);
                if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
                    return { status: 400, body: { message: 'Ngày không hợp lệ' } };
                }
                const diff = newEnd - newStart;
                const minMs2 = 30 * 24 * 60 * 60 * 1000;
                if (diff <= 0) {
                    return { status: 400, body: { message: 'Ngày kết thúc phải sau ngày bắt đầu' } };
                }
                if (diff < minMs2) {
                    return { status: 400, body: { message: 'Thời hạn hợp đồng phải ít nhất 30 ngày' } };
                }
            }
            if (monthly_rent !== undefined) updates.monthly_rent = monthly_rent;
            if (deposit_amount !== undefined) updates.deposit_amount = deposit_amount;
            if (contract_url !== undefined) updates.contract_url = contract_url;
            if (status !== undefined) {
                if (user.role !== 'admin' && user.role !== 'landlord') {
                    return { status: 403, body: { message: 'Không có quyền thay đổi trạng thái hợp đồng' } };
                }
                updates.status = status;
            }

            const updatedContract = await contractRepository.update(id, updates);

            return {
                status: 200,
                body: {
                    message: 'Cập nhật hợp đồng thành công',
                    contract: updatedContract
                }
            };
        } catch (err) {
            console.error('Update Contract Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async deleteContract(id, user) {
        try {
            const contract = await contractRepository.findById(id);

            if (!contract) {
                return { status: 404, body: { message: 'Không tìm thấy hợp đồng' } };
            }

            if (user.role === 'tenant' && contract.tenant_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền xóa hợp đồng này' } };
            }

            if (user.role === 'landlord' && contract.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền xóa hợp đồng này' } };
            }

            if (user.role !== 'tenant' && user.role !== 'landlord' && user.role !== 'admin') {
                return { status: 403, body: { message: 'Không có quyền xóa hợp đồng' } };
            }

            await contractRepository.delete(id);

            await rentalPostRepository.update(contract.post_id, { is_available: true });

            return { status: 200, body: { message: 'Xóa hợp đồng thành công' } };
        } catch (err) {
            console.error('Delete Contract Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async terminateContract(id, user) {
        try {
            const contract = await contractRepository.findById(id);

            if (!contract) {
                return { status: 404, body: { message: 'Không tìm thấy hợp đồng' } };
            }

            if (user.role !== 'landlord' && user.role !== 'admin') {
                return { status: 403, body: { message: 'Chỉ landlord hoặc admin mới có quyền kết thúc hợp đồng' } };
            }

            if (user.role === 'landlord' && contract.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Bạn không thể kết thúc hợp đồng này' } };
            }

            if (contract.status === 'terminated') {
                return { status: 400, body: { message: 'Hợp đồng đã được kết thúc' } };
            }

            const updatedContract = await contractRepository.updateStatus(id, 'terminated');

            await rentalPostRepository.update(contract.post_id, { is_available: true });

            return {
                status: 200,
                body: {
                    message: 'Kết thúc hợp đồng thành công',
                    contract: updatedContract
                }
            };
        } catch (err) {
            console.error('Terminate Contract Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }
}

module.exports = new ContractService();
