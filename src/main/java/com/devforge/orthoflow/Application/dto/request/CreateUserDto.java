package com.devforge.orthoflow.Application.dto.request;

import com.devforge.orthoflow.Domain.entity.user.Role;
import lombok.Data;

@Data
public class CreateUserDto {
    private String username;
    private String password;
    private Role role;

    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String nic;
    //private String designation;
}
