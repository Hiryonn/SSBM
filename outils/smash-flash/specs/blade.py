SPEC = dict(
    name='Blade', sheet='bladeV2.gif', credit='Topcat (Riku)', sounds='Blade', height=56,
    anims=dict(
        idle=['4.0', '4.1'], walk='3.1-3.8', run='9.1-9.6', crouch=['7.1'], jumpSquat=['7.1'],
        jump=['7.0'], doubleJump=['10.0', '10.1', '11.0', '11.1'], fall=['7.0'], land=['7.1'],
        shield=['5.0'], dodge=['4.7'], roll=['10.0', '10.1'], hurt=['4.6'], hurtAir=['4.5'], tumble=['10.0', '11.0'],
        lie=['7.2'], getup=['7.1'], taunt=['4.2', '4.3'], win=['3.0'],
        jab=['6.3', '6.4'], ftilt=['8.3', '8.4'], utilt=['8.0'], dtilt=['7.2', '7.3'], dash=['9.0', '9.2'],
        fsmash=['6.0', '6.1', '6.2'], usmash=['8.0', '8.1'], dsmash=['8.2', '8.5'],
        nair=['11.0', '11.1'], fair=['10.1'], uair=['8.1'], dair=['8.5'],
        neutralB=['10.2', '10.3'], sideB=['10.4', '10.5'], upB=['11.0', '11.1', '11.0'], downB=['7.1', '7.2'],
        grab=['6.3', '4.4'],
    ),
    times=dict(idle=14, walk=6, run=4, doubleJump=3, upB=4, fsmash=[10, 5, 12]),
    moves=dict(upB=dict(vy=-9.5, helpless=True, hit=dict(dmg=10)), sideB=dict(vx=7, hit=dict(dmg=11))),
    stats=dict(weight=92, walkSpeed=1.5, runSpeed=3.5, jumpForce=8.8, doubleJumpForce=8.0),
)
