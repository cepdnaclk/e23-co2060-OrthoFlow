package com.devforge.orthoflow.Application.controllers;

import com.devforge.orthoflow.Application.dto.request.CreateUserDto;
import com.devforge.orthoflow.Domain.entity.user.User;
import com.devforge.orthoflow.Domain.service.AdminService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    @Autowired
    private AdminService adminService;

    @PostMapping("/create-user")
    public ResponseEntity<User> createUser(@RequestBody CreateUserDto createUserDto){
        User user = adminService.createUser(createUserDto);
        return ResponseEntity.ok(user);
    }
}
