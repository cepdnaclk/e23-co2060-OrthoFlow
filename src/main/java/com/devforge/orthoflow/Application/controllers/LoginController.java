package com.devforge.orthoflow.Application.controllers;

import com.devforge.orthoflow.Application.dto.request.LoginRequestDto;
import com.devforge.orthoflow.Application.dto.response.LoginResponseDto;
import com.devforge.orthoflow.Domain.service.AuthService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping
@AllArgsConstructor
public class LoginController {
    @Autowired
    private AuthService authService;
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto loginRequestDto){
        return ResponseEntity.ok(authService.login(loginRequestDto));

    }
}
