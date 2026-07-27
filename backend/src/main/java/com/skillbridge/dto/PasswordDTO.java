package com.skillbridge.dto;

import lombok.Data;

public class PasswordDTO {
    @Data
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;
    }
}
